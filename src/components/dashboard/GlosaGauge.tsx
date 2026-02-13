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

  const largeArcFlag = 0;

  // Ângulo do ponteiro dentro do semicírculo
  const pointerAngle = Math.PI + (Math.PI * safeValue) / max;
  const pointerRadius = radius - 6;
  const pointerX = centerX + pointerRadius * Math.cos(pointerAngle);
  const pointerY = centerY + pointerRadius * Math.sin(pointerAngle);

  const roundedPercent = Math.round(percentage);

  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox="0 0 120 80"
        className="h-16 w-full max-w-[220px]"
        aria-hidden="true"
      >
        {/* Arco de fundo */}
        <path
          d="M 16 60 A 44 44 0 0 1 104 60"
          fill="none"
          stroke="rgba(245,245,245,0.10)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Arco preenchido conforme o valor (não renderiza se valor = 0) */}
        {safeValue > 0 && (
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
            fill="none"
            stroke="url(#glosa-gauge-gradient)"
            strokeWidth={10}
            strokeLinecap="round"
          />
        )}

        <defs>
          <linearGradient
            id="glosa-gauge-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
        </defs>

        {/* Ponteiro */}
        <line
          x1={centerX}
          y1={centerY}
          x2={pointerX}
          y2={pointerY}
          stroke="#D4A017"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill="#D4A017"
          stroke="#0b0b0b"
          strokeWidth={2}
        />

        {/* Percentual no centro do arco */}
        <text
          x={centerX}
          y={52}
          fontSize="14"
          fontWeight="700"
          textAnchor="middle"
          fill="#F5F5F5"
        >
          {roundedPercent}%
        </text>

        {/* Marcadores 0% e 100% */}
        <text x={20} y={68} fontSize="8" fill="rgba(156, 163, 175, 0.9)">
          0%
        </text>
        <text
          x={100}
          y={68}
          fontSize="8"
          textAnchor="end"
          fill="rgba(156, 163, 175, 0.9)"
        >
          100%
        </text>
      </svg>
    </div>
  );
};

export default GlosaGauge;