import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  subscriptionCanceled?: boolean;
  className?: string;
};

export default function UserAvatarButton({
  displayName,
  avatarUrl,
  subscriptionCanceled,
  className,
}: Props) {
  const fallback = useMemo(() => initials(displayName), [displayName]);

  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full",
        "bg-white/60 ring-1 ring-slate-200 shadow-sm backdrop-blur transition-colors hover:bg-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "dark:bg-slate-900/60 dark:ring-slate-700 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950",
        subscriptionCanceled &&
          "ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950",
        className,
      )}
      aria-label="Menu do usuário"
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
        <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
          {fallback}
        </AvatarFallback>
      </Avatar>

      {/* Status dot sutil (online/ok) */}
      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950" />
    </button>
  );
}