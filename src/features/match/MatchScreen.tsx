import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { Room } from '@/types/room';
import { ProviderChips } from './ProviderChips';

const CONFETTI_COLORS = ['#ffffff', '#ff375f', '#ffd60a', '#64d2ff']; // iOS system tints
const SHEET_SPRING = { type: 'spring', stiffness: 380, damping: 36 } as const;

export function MatchScreen({
  room, isHost, onNextRound, starting,
}: { room: Room; isHost: boolean; onNextRound: () => void; starting: boolean }) {
  const movie = room.deck.find((m) => m.id === room.matchedMovieId);
  const reduceMotion = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const end = Date.now() + 2200;
    let raf = 0;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: CONFETTI_COLORS });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: CONFETTI_COLORS });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => { cancelAnimationFrame(raf); confetti.reset(); };
  }, [reduceMotion]);

  if (!movie) return null;

  const poster = `https://image.tmdb.org/t/p/w780${movie.posterPath}`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-neutral-950 p-6 text-center">
      {/* Blurred, saturated poster as ambient backdrop */}
      <img
        src={poster} alt="" aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-3xl saturate-150"
      />
      <div className="pointer-events-none absolute inset-0 bg-neutral-950/50" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium uppercase tracking-[0.18em] text-white/60"
        >
          It's a match
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
          className="relative mt-5 w-full overflow-hidden rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/10"
        >
          <img src={poster} alt={movie.title} className="aspect-[2/3] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-black/25 p-4 text-left ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{movie.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm tabular-nums text-white/70">
              <span>{movie.year}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-white/80">
                <Star size={13} fill="currentColor" /> {movie.rating.toFixed(1)}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-white/70">{movie.overview}</p>
          </div>
        </motion.div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.97]"
          >
            Where to watch
          </button>
          {isHost ? (
            <button
              onClick={onNextRound} disabled={starting}
              className="rounded-full bg-white/10 py-3.5 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/10 backdrop-blur-2xl transition active:scale-[0.97] disabled:opacity-50"
            >
              {starting ? 'Shuffling deck…' : 'Play next round'}
            </button>
          ) : (
            <p className="py-2 text-sm text-white/50">Waiting for host to start the next round…</p>
          )}
        </div>
      </div>

      {/* Cupertino-style bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-20 bg-black/40"
            />
            <motion.div
              key="sheet"
              role="dialog" aria-label="Where to watch"
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.6 }}
              onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) setSheetOpen(false); }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={SHEET_SPRING}
              className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[2rem] border-t border-white/10 bg-neutral-900/70 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-left backdrop-blur-2xl backdrop-saturate-150"
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Where to watch</h2>
              <ProviderChips movieId={movie.id} region={room.settings.region} />
              <p className="mt-4 text-center text-[11px] text-white/40">
                Streaming data powered by JustWatch via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}