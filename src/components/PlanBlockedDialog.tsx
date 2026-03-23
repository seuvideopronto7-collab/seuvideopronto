import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlanBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

const PlanBlockedDialog = ({ open, onOpenChange, title, description }: PlanBlockedDialogProps) => {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || "Você atingiu o limite do seu plano"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || "Para continuar, faça upgrade do seu plano."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate("/planos")}>Fazer upgrade</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PlanBlockedDialog;
