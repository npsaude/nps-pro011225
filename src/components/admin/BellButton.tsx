import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  onClick?: () => void;
  className?: string;
};

export default function BellButton({ count = 0, onClick, className }: Props) {
  const show = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full",
        "bg-white/70 text-slate-600 ring-1 ring-slate-200 shadow-sm backdrop-blur",
        "transition-colors hover:bg-white hover:text-slate-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "dark:bg-slate-900/70 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-50 dark:focus-visible:ring-offset-slate-950",
        className,
      )}
      aria-label={
        show ? `Notificações (${count} não lidas)` : "Notificações (0 não lidas)"
      }
    >
      {show ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#D4A017] px-1 text-[11px] font-semibold text-slate-950 shadow-sm ring-2 ring-white dark:ring-slate-950">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}

      <Bell className="h-[18px] w-[18px]" />
    </button>
  );
}