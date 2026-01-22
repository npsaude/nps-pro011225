import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PLANS_URL = "https://site.conmedic.com.br/planos";

export default function SubscriptionExpiredDialog({
  open,
  onOpenChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrição encerrada</DialogTitle>
          <DialogDescription>
            Sua assinatura está fora do prazo de validade. Para continuar
            acessando o sistema, renove sua inscrição.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button asChild>
            <a href={PLANS_URL} target="_blank" rel="noreferrer">
              Renovar inscrição
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}