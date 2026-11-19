import type { ProductShape } from "@/lib/types";

/**
 * Generated studio "render" used until real product photography is uploaded
 * from the admin dashboard. Pure SVG — zero network cost.
 */
export function ProductVisual({
  shape, tint, id, label, className = "",
}: { shape: ProductShape; tint: string; id: string; label?: string; className?: string }) {
  const g = `pv-${id}`;
  return (
    <svg viewBox="0 0 400 500" className={className} role="img" aria-label={label ?? "Product"}>
      <defs>
        <radialGradient id={`${g}-bg`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#2a2620" />
          <stop offset="60%" stopColor="#111" />
          <stop offset="100%" stopColor="#060606" />
        </radialGradient>
        <linearGradient id={`${g}-gold`} x1="0" x2="1">
          <stop offset="0%" stopColor="#7a5a24" />
          <stop offset="35%" stopColor="#f0d79c" />
          <stop offset="55%" stopColor="#c9a45c" />
          <stop offset="80%" stopColor="#fff1c8" />
          <stop offset="100%" stopColor="#6e5020" />
        </linearGradient>
        <linearGradient id={`${g}-body`} x1="0" x2="1">
          <stop offset="0%" stopColor={tint} stopOpacity="0.95" />
          <stop offset="30%" stopColor={tint} stopOpacity="0.55" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor={tint} stopOpacity="0.6" />
          <stop offset="100%" stopColor={tint} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${g}-shine`} x1="0" x2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${g}-bg)`} />
      <ellipse cx="200" cy="430" rx="120" ry="14" fill="#000" opacity="0.6" />
      <ellipse cx="200" cy="428" rx="90" ry="6" fill="#c9a45c" opacity="0.12" />
      {renderShape(shape, g)}
    </svg>
  );
}

function renderShape(shape: ProductShape, g: string) {
  const gold = `url(#${g}-gold)`;
  const body = `url(#${g}-body)`;
  const shine = `url(#${g}-shine)`;
  switch (shape) {
    case "perfume":
      return (
        <g>
          <rect x="120" y="200" width="160" height="225" rx="22" fill={body} stroke="#ffffff22" />
          <rect x="138" y="215" width="14" height="190" rx="7" fill={shine} opacity="0.7" />
          <rect x="160" y="290" width="80" height="44" rx="2" fill="#0a0a0a" opacity="0.75" />
          <rect x="166" y="296" width="68" height="32" fill="none" stroke={gold} strokeWidth="1" />
          <rect x="172" y="170" width="56" height="32" rx="3" fill={gold} />
          <rect x="160" y="90" width="80" height="82" rx="10" fill="#0d0d0d" stroke={gold} strokeWidth="2" />
          <rect x="172" y="98" width="8" height="66" rx="4" fill="#ffffff" opacity="0.12" />
        </g>
      );
    case "dropper":
      return (
        <g>
          <rect x="140" y="230" width="120" height="195" rx="18" fill={body} stroke="#ffffff22" />
          <rect x="154" y="245" width="10" height="165" rx="5" fill={shine} opacity="0.7" />
          <rect x="165" y="310" width="70" height="40" fill="#0a0a0a" opacity="0.7" />
          <rect x="168" y="195" width="64" height="38" rx="4" fill={gold} />
          <path d="M175 195 Q175 110 200 105 Q225 110 225 195 Z" fill="#0d0d0d" stroke={gold} strokeWidth="1.5" />
        </g>
      );
    case "pump":
      return (
        <g>
          <rect x="135" y="190" width="130" height="235" rx="26" fill={body} stroke="#ffffff22" />
          <rect x="150" y="205" width="12" height="200" rx="6" fill={shine} opacity="0.6" />
          <rect x="160" y="290" width="80" height="60" fill="#0a0a0a" opacity="0.6" />
          <rect x="178" y="160" width="44" height="32" rx="3" fill={gold} />
          <rect x="192" y="120" width="16" height="42" fill="#0d0d0d" stroke={gold} />
          <path d="M180 112 h70 a6 6 0 0 1 0 12 h-70 z" fill="#0d0d0d" stroke={gold} />
        </g>
      );
    case "tube":
      return (
        <g>
          <path d="M150 120 L250 120 L270 380 L130 380 Z" fill={body} stroke="#ffffff22" />
          <rect x="128" y="105" width="144" height="16" rx="2" fill={gold} />
          <rect x="160" y="230" width="80" height="70" fill="#0a0a0a" opacity="0.6" />
          <rect x="165" y="380" width="70" height="45" rx="6" fill="#0d0d0d" stroke={gold} />
          <path d="M165 140 L175 360" stroke="#fff" strokeOpacity="0.25" strokeWidth="8" strokeLinecap="round" />
        </g>
      );
    case "jar":
      return (
        <g>
          <rect x="110" y="300" width="180" height="125" rx="24" fill={body} stroke="#ffffff22" />
          <rect x="125" y="312" width="12" height="100" rx="6" fill={shine} opacity="0.6" />
          <rect x="104" y="250" width="192" height="58" rx="14" fill={gold} />
          <rect x="104" y="275" width="192" height="3" fill="#000" opacity="0.25" />
          <rect x="165" y="345" width="70" height="40" fill="#0a0a0a" opacity="0.6" />
        </g>
      );
    case "bar":
      return (
        <g>
          <rect x="90" y="320" width="220" height="100" rx="30" fill={body} stroke="#ffffff22" />
          <ellipse cx="200" cy="350" rx="80" ry="12" fill="#fff" opacity="0.12" />
          <text x="200" y="378" textAnchor="middle" fontFamily="serif" fontSize="22" fill="#000" opacity="0.4" letterSpacing="6">ZEH</text>
        </g>
      );
    case "brush":
      return (
        <g>
          <path d="M150 180 Q200 70 250 180 L240 230 L160 230 Z" fill="#d9d2c4" />
          <path d="M160 200 Q200 120 240 200" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="4" />
          <rect x="164" y="230" width="72" height="14" fill={gold} />
          <path d="M168 244 L232 244 L245 425 L155 425 Z" fill="#111" stroke="#ffffff22" />
          <rect x="175" y="255" width="8" height="160" fill="#fff" opacity="0.1" />
        </g>
      );
    case "kit":
      return (
        <g>
          <rect x="70" y="250" width="260" height="175" rx="8" fill="#0d0d0d" stroke={gold} strokeWidth="2" />
          <rect x="70" y="230" width="260" height="30" rx="4" fill="#151515" stroke={gold} />
          <rect x="95" y="160" width="50" height="95" rx="10" fill={body} />
          <rect x="160" y="130" width="40" height="125" rx="8" fill={body} />
          <rect x="215" y="175" width="44" height="80" rx="6" fill={body} />
          <rect x="268" y="195" width="40" height="60" rx="12" fill={gold} />
          <text x="200" y="350" textAnchor="middle" fontFamily="serif" fontSize="20" fill="#c9a45c" letterSpacing="8">ZEB·E·HUSN</text>
        </g>
      );
  }
}
