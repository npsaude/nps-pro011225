import { useState } from "react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  className?: string;
}

export default function LockedMenuItem({ label, icon, className }: LockedMenuItemProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={`${label} — bloqueado`}
      >
        {icon ? <span>{icon}</span> : null}
        <span className="flex-1 text-left opacity-50">{label}</span>
        <Lock className="h-3.5 w-3.5 opacity-50 shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <DialogTitle className="text-center">Funcionalidade bloqueada</DialogTitle>
            <DialogDescription className="text-center">
              Esta funcionalidade não está disponível no seu plano atual. Faça upgrade para acessar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => {
                setOpen(false);
                navigate("/planos");
              }}
              className="w-full"
            >
              Ver planos
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
