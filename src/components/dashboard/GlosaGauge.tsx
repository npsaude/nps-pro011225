interface GlosaGaugeProps {
  value: number; // 0 a 100
  max?: number;
}

const GlosaGauge = ({ value, max = 100 }: GlosaGaugeProps) => {
  const safeValue = Math.max(0, Math.min(value, max));
  const percentage = (safeValue / max) * 100;

  const centerX = 60;
  const centerY = 60;
  const radius = 44;

  // Semicírculo de 180° (esquerda) a 360° (direita)
  const startAngle = Math.PI;
  const endAngle = Math.PI * (1 + safeValue / max);

  const startX = centerX + radius * Math.cos(startAngle);
  const startY = centerY + radius * Math.sin(startAngle);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY + radius * Math.sin(endAngle);

  const largeArcFlag = safeValue > max / 2 ? 1 : 0;

  // Ângulo do ponteiro dentro do semicírculo
  const pointerAngle = Math.PI + (Math.PI * safeValue) / max;
  const pointerRadius = radius - 6;
  const pointerX = centerX + pointerRadius * Math.cos(pointerAngle);
  const pointerY = centerY + pointerRadius * Math.sin(pointerAngle);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 120 70"
        className="h-24 w-full max-w-[220px]"
        aria-hidden="true"
      >
        {/* Arco de fundo */}
        <path
          d="M 16 60 A 44 44 0 0 1 104 60"
          fill="none"
          stroke="rgba(15,23,42,0.9)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Arco preenchido conforme o valor */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
          fill="none"
          stroke="url(#glosa-gauge-gradient)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        <defs>
          <linearGradient
            id="glosa-gauge-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>

        {/* Ponteiro */}
        <line
          x1={centerX}
          y1={centerY}
          x2={pointerX}
          y2={pointerY}
          stroke="#22c55e"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill="#22c55e"
          stroke="#022c22"
          strokeWidth={2}
        />

        {/* Marcadores 0% e 100% */}
        <text
          x={20}
          y={65}
          fontSize="8"
          fill="rgba(148, 163, 184, 0.9)"
        >
          0%
        </text>
        <text
          x={96}
          y={65}
          fontSize="8"
          textAnchor="end"
          fill="rgba(148, 163, 184, 0.9)"
        >
          100%
        </text>
      </svg>

      {/* Percentual abaixo do velocímetro */}
      <div className="mt-1 flex flex-col items-center">
        <span className="text-2xl font-semibold text-emerald-100">
          {percentage.toFixed(0)}%
        </span>
        <span className="text-[11px] text-emerald-100/80">
          glosa recuperada
        </span>
      </div>
    </div>
  );
};

export default GlosaGauge;