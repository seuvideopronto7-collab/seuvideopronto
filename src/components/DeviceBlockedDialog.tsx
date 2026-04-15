import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Shield, Monitor } from "lucide-react";

interface DeviceBlockedDialogProps {
  open: boolean;
  reason: "blocked" | "max_reached";
  onSignOut: () => void;
}

export default function DeviceBlockedDialog({ open, reason, onSignOut }: DeviceBlockedDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <Shield className="w-5 h-5" />
            <AlertDialogTitle>
              {reason === "blocked" ? "Dispositivo Bloqueado" : "Limite de Dispositivos"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            {reason === "blocked" ? (
              <p>
                Este dispositivo foi bloqueado pelo administrador.
                Entre em contato com o suporte para desbloquear.
              </p>
            ) : (
              <>
                <p>
                  Você atingiu o limite máximo de <strong>3 dispositivos</strong> simultâneos.
                </p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <span>Desconecte um dispositivo anterior ou aguarde 24h para liberar um slot.</span>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onSignOut} className="bg-destructive text-destructive-foreground">
            Sair da conta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
