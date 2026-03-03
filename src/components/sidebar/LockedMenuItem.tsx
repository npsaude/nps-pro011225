import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LockedMenuItemProps {
  label: string;
  icon?: React.ReactNode;
  /** Classe CSS do item (mesmo visual do item normal) */
  className?: string;
  /** Se true, renderiza como sub-item (sem ícone próprio, indentado) */
  isSubItem?: boolean;
}

export function LockedMenuItem({
  label,
  icon,
  className,
  isSubItem = false,
}: LockedMenuItemProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (isSubItem) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={className}
        >
          <span className="ml-7 flex items-center gap-1.5 opacity-40">
            {label}
          </span>
          <Lock className="h-3 w-3 opacity-40" />
        </button>

        <LockedDialog open={open} onOpenChange={setOpen} onViewPlans={() => navigate("/planos")} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        <span className="flex items-center gap-3 opacity-40">
          {icon}
          <span className="font-medium">{label}</span>
        </span>
        <Lock className="h-3.5 w-3.5 opacity-40" />
      </button>

      <LockedDialog open={open} onOpenChange={setOpen} onViewPlans={() => navigate("/planos")} />
    </>
  );
}

function LockedDialog({
  open,
  onOpenChange,
  onViewPlans,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onViewPlans: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <DialogTitle>Funcionalidade bloqueada</DialogTitle>
          <DialogDescription>
            Esta funcionalidade não está disponível no seu plano atual. Faça
            upgrade para acessar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onViewPlans} className="w-full">
            Ver planos
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
