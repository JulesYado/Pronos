import { motion } from 'framer-motion';

const shapes = [
  { x: '4%', y: '12%', s: 7, kind: 'circle', c: 'var(--shape-1)', d: 18 },
  { x: '88%', y: '8%', s: 6, kind: 'tri', c: 'var(--shape-2)', d: 22 },
  { x: '92%', y: '70%', s: 8, kind: 'squiggle', c: 'var(--shape-3)', d: 26 },
  { x: '6%', y: '78%', s: 6, kind: 'square', c: 'var(--shape-4)', d: 20 },
  { x: '48%', y: '92%', s: 5, kind: 'tri', c: 'var(--shape-1)', d: 24 },
  { x: '60%', y: '4%', s: 4, kind: 'circle', c: 'var(--shape-3)', d: 16 },
];

function Shape({ kind, c }: { kind: string; c: string }) {
  switch (kind) {
    case 'circle':
      return <circle cx="50" cy="50" r="40" fill="none" stroke={c} strokeWidth="14" />;
    case 'tri':
      return <polygon points="50,8 92,88 8,88" fill={c} />;
    case 'square':
      return <rect x="15" y="15" width="70" height="70" fill="none" stroke={c} strokeWidth="12" strokeDasharray="14 10" />;
    default:
      return <path d="M5 50 Q 20 15 35 50 T 65 50 T 95 50" fill="none" stroke={c} strokeWidth="12" strokeLinecap="round" />;
  }
}

/** Fond Memphis années 90 : pois + formes qui flottent. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      {shapes.map((s, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 100"
          className="backdrop__shape"
          style={{ left: s.x, top: s.y, width: `${s.s}rem`, height: `${s.s}rem` }}
          animate={{ rotate: [0, i % 2 ? 25 : -25, 0], y: [0, -14, 0] }}
          transition={{ duration: s.d, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Shape kind={s.kind} c={s.c} />
        </motion.svg>
      ))}
    </div>
  );
}
