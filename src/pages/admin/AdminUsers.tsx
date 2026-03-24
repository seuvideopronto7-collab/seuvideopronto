import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Save, Shield, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

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

const AdminUsers = () => {
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
      toast.error("Erro ao carregar usuarios");
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
      toast.success(!currentStatus ? "Usuario ativado!" : "Usuario desativado.");
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
      toast.success("Usuario atualizado!");
      setEditUser(null);
      fetchUsers();
    }
  };

  return (
    <AdminLayout title="Usuarios" description="Controle de acesso e perfis">
      <div className="cinema-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#f5c451]" />
            <h2 className="text-lg font-semibold">Usuarios cadastrados</h2>
          </div>
          <Badge variant="secondary" className="font-mono">
            {users.length} usuarios
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
                  <TableHead className="text-right">Acoes</TableHead>
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
                        className={u.is_active ? "bg-[#22c55e]/20 text-[#7ee2a8] border-[#22c55e]/30" : ""}
                      >
                        {u.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="glass" size="sm" onClick={() => toggleActive(u.id, u.is_active)}>
                        {u.is_active ? (
                          <>
                            <UserX className="w-3 h-3" /> Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" /> Ativar
                          </>
                        )}
                      </Button>
                      <Button variant="glass" size="sm" onClick={() => openEdit(u)}>
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

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
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
              Salvar alteracoes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
