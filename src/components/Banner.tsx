import { useEffect, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface BannerData {
  id: number;
  kicker: string;
  title: string;
  sub?: string;
  color?: string;
}

/** Bandeau de transition plein écran (nouveau joueur, nouveau tour…), se ferme seul. */
export function Banner({ banner, onClose }: { banner: BannerData | null; onClose: () => void }) {
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(onClose, 1900);
    return () => clearTimeout(t);
  }, [banner]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {banner && (
        <motion.div key={banner.id} className="banner" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="banner__card card"
            style={{ '--pc': banner.color ?? 'var(--lemon)' } as CSSProperties}
            initial={{ x: '-120vw', rotate: -8 }}
            animate={{ x: 0, rotate: -2 }}
            exit={{ x: '120vw', rotate: 8 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
          >
            <span className="banner__kicker">{banner.kicker}</span>
            <strong className="banner__title">{banner.title}</strong>
            {banner.sub && <span className="banner__sub">{banner.sub}</span>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
