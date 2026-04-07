import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, Settings, User, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoSvp from "@/assets/logo-svp.png";

const HomeHeader = () => {
  const { user, signOut, isAdmin, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const avatarUrl = avatarPreview || profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      toast.error("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB).");
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
      await refreshProfile();
      toast.success("Foto atualizada!");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Falha ao enviar foto.");
      setAvatarPreview(null);
    } finally {
      setUploading(false);
    }
  };
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "Usuário");
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 transition-all duration-200 hover:opacity-80 hover:scale-[1.01] focus:outline-none"
        >
          <img
            src={logoSvp}
            alt="Seu Vídeo Pronto"
            className="h-8 w-auto object-contain"
            width={32}
            height={32}
          />
          <div className="leading-none">
            <p className="text-sm font-bold text-foreground">Seu Vídeo Pronto</p>
            <p className="text-[10px] text-muted-foreground">Cinema IA</p>
          </div>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/admin/dashboard")}
              className="h-8 px-2.5 transition-all duration-200 hover:scale-[1.02]"
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 pr-2 transition-all duration-200 hover:bg-accent/50 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/30">
                <Avatar className="h-8 w-8 border border-border/40">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate">
                    {displayName}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer gap-2 transition-all duration-200"
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {uploading ? "Enviando..." : "Alterar foto"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/dashboard")}
                className="cursor-pointer gap-2 transition-all duration-200"
              >
                <User className="w-4 h-4" />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/apis")}
                className="cursor-pointer gap-2 transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
