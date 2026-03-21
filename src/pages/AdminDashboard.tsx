import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Loader2, UserCheck, UserX, Pencil, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  youtube_channel: string;
  instagram: string;
  tiktok: string;
  is_active: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar usuários");
    } else {
      setUsers((data as UserProfile[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleActive = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(!currentStatus ? "Usuário ativado! ✅" : "Usuário desativado ❌");
      fetchUsers();
    }
  };

  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name,
      whatsapp: user.whatsapp,
      email: user.email,
      youtube_channel: user.youtube_channel,
      instagram: user.instagram,
      tiktok: user.tiktok,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...editForm, updated_at: new Date().toISOString() })
      .eq("id", editUser.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Usuário atualizado! ✅");
      setEditUser(null);
      fetchUsers();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Gerenciar Usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Sistema
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-neon-pink" />
              <h2 className="text-lg font-semibold">Usuários Cadastrados</h2>
            </div>
            <Badge variant="secondary" className="font-mono">
              {users.length} usuários
            </Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{u.whatsapp || "—"}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.is_active ? "default" : "destructive"}
                          className={u.is_active ? "bg-accent/20 text-accent border-accent/30" : ""}
                        >
                          {u.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => toggleActive(u.id, u.is_active)}
                        >
                          {u.is_active ? (
                            <><UserX className="w-3 h-3" /> Desativar</>
                          ) : (
                            <><UserCheck className="w-3 h-3" /> Ativar</>
                          )}
                        </Button>
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="w-3 h-3" /> Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Nome</label>
              <Input
                value={editForm.full_name || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                className="bg-muted/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">WhatsApp</label>
              <Input
                value={editForm.whatsapp || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, whatsapp: e.target.value }))}
                className="bg-muted/50 border-border/50"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">YouTube</label>
                <Input
                  value={editForm.youtube_channel || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, youtube_channel: e.target.value }))}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Instagram</label>
                <Input
                  value={editForm.instagram || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, instagram: e.target.value }))}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">TikTok</label>
                <Input
                  value={editForm.tiktok || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, tiktok: e.target.value }))}
                  className="bg-muted/50 border-border/50"
                />
              </div>
            </div>
            <Button variant="neon" onClick={handleSaveEdit} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
