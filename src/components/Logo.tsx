const CENTRE = 12;
const RADIUS = 9.6;

const petals = Array.from({ length: 6 }, (_, index) => {
  const angle = ((index * 60 - 90) * Math.PI) / 180;
  const x = (CENTRE + RADIUS * Math.cos(angle)).toFixed(2);
  const y = (CENTRE + RADIUS * Math.sin(angle)).toFixed(2);
  return `M${CENTRE} ${CENTRE}A${RADIUS} ${RADIUS} 0 0 1 ${x} ${y}A${RADIUS} ${RADIUS} 0 0 1 ${CENTRE} ${CENTRE}`;
});

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
    >
      <circle cx={CENTRE} cy={CENTRE} r={RADIUS} />
      {petals.map((d) => (
        <path key={d} d={d} />
      ))}
      <circle cx={CENTRE} cy={CENTRE} r="1.7" className="fill-spark" stroke="none" />
    </svg>
  );
}
