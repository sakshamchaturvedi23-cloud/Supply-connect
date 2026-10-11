export function riskTone(score: number) {
  if (score >= 75) return { color: '#FFFFFF', label: 'Critical risk (P0)' };
  if (score >= 50) return { color: '#E4E4E7', label: 'Elevated risk (P1)' };
  return { color: '#A1A1AA', label: 'Moderate risk (P2)' };
}

export function RiskGauge({ score }: { score: number }) {
  const r = 52;
  const len = Math.PI * r;
  const { color, label } = riskTone(score);
  const arc = 'M12 68 A52 52 0 0 1 116 68';

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Risk score ${score} out of 100, ${label}`}>
      <svg viewBox="0 0 128 78" className="w-44">
        <path d={arc} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="10" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(len * score) / 100} ${len}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="64" y="62" textAnchor="middle" fill="#FFFFFF" fontSize="28" fontWeight="500" letterSpacing="-1">
          {score}
        </text>
      </svg>
      <span className="-mt-1 text-[13px] font-medium text-white/90">
        {label}
      </span>
    </div>
  );
}
