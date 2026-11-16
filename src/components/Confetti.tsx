import { useEffect, useState, type CSSProperties } from 'react';

const COLORS = ['var(--pink)', 'var(--sky)', 'var(--mint)', 'var(--lemon)', 'var(--lilac)', 'var(--peach)'];

interface Piece {
  id: number;
  style: CSSProperties;
}

/** Pluie de confettis à chaque changement de `fire` (> 0). */
export function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const batch = Array.from({ length: 90 }, (_, i) => ({
      id: fire * 1000 + i,
      style: {
        left: `${Math.random() * 100}%`,
        background: COLORS[i % COLORS.length],
        width: `${0.4 + Math.random() * 0.5}rem`,
        height: `${0.6 + Math.random() * 0.8}rem`,
        animationDelay: `${Math.random() * 0.5}s`,
        animationDuration: `${1.8 + Math.random() * 1.4}s`,
        '--drift': `${(Math.random() - 0.5) * 16}rem`,
        '--spin': `${(Math.random() - 0.5) * 1440}deg`,
        borderRadius: i % 3 === 0 ? '50%' : '0.1rem',
      } as CSSProperties,
    }));
    setPieces(batch);
    const t = setTimeout(() => setPieces([]), 3600);
    return () => clearTimeout(t);
  }, [fire]);
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <span key={p.id} className="confetti__piece" style={p.style} />
      ))}
    </div>
  );
}
