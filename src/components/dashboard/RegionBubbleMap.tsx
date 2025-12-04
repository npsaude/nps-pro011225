const bubbles = [
  // Norte / Nordeste / Centro-oeste (baixa densidade - amarelo)
  { label: "AC", x: 14, y: 58, size: "sm", density: "low" },
  { label: "AM", x: 32, y: 38, size: "lg", density: "low" },
  { label: "RR", x: 34, y: 24, size: "sm", density: "low" },
  { label: "PA", x: 46, y: 32, size: "lg", density: "low" },
  { label: "RO", x: 26, y: 52, size: "sm", density: "low" },
  { label: "TO", x: 48, y: 48, size: "sm", density: "low" },
  { label: "MA", x: 60, y: 40, size: "sm", density: "low" },
  { label: "PI", x: 64, y: 44, size: "sm", density: "low" },
  { label: "CE", x: 69, y: 44, size: "sm", density: "low" },
  { label: "PE", x: 74, y: 50, size: "sm", density: "low" },
  { label: "GO", x: 50, y: 60, size: "sm", density: "low" },
  { label: "MS", x: 44, y: 70, size: "md", density: "low" },
  { label: "MT", x: 42, y: 58, size: "lg", density: "low" },

  // Alta densidade (azul)
  { label: "SP", x: 54, y: 80, size: "md", density: "high" },
  { label: "PR", x: 52, y: 88, size: "sm", density: "high" },

  // Média densidade (verde)
  { label: "BA", x: 66, y: 66, size: "lg", density: "medium" },
  { label: "MG", x: 60, y: 74, size: "lg", density: "medium" },
  { label: "RS", x: 50, y: 94, size: "lg", density: "medium" },
];

type Density = "low" | "medium" | "high";

const densityColor: Record<Density, string> = {
  low: "bg-amber-400",
  medium: "bg-emerald-500",
  high: "bg-[#1d4ed8]",
};

const sizeClass: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-xs",
};

const RegionBubbleMap = () => {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl bg-[#F5F7F9] p-6 dark:bg-slate-900">
      <div className="relative h-80 w-full">
        {bubbles.map((b) => (
          <div
            key={b.label}
            className={`absolute flex items-center justify-center rounded-full font-semibold text-white shadow-md shadow-slate-400/40 dark:shadow-slate-900/60 ${densityColor[b.density as Density]} ${sizeClass[b.size as "sm" | "md" | "lg"]}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {b.label}
          </div>
        ))}
      </div>

      <div className="inline-flex flex-wrap gap-4 rounded-2xl bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm dark:bg-slate-950/80 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#1d4ed8]" />
          <span>Alta densidade (Azul)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Média densidade (Verde)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span>Baixa densidade (Amarelo)</span>
        </div>
      </div>
    </div>
  );
};

export default RegionBubbleMap;