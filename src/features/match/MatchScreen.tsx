import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Room } from '@/types/room';
import { ProviderChips } from './ProviderChips';
import { leaveRoom } from '../room/rooms.service';

// Utility type to extract MovieCard from Room
type MovieCard = NonNullable<Room['deck']>[0];

const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;
const SHEET_SPRING = { type: 'spring', stiffness: 380, damping: 36 } as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
  const dist = 170 + (i % 3) * 36;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist * 1.15,
    size: 3 + (i % 3) * 1.5,
    delay: 0.25 + (i % 5) * 0.05,
  };
});

function Celebration() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute -inset-14 bg-[radial-gradient(closest-side,rgba(255,255,255,0.5),transparent)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.35], scale: [0.7, 1.05, 1] }}
        transition={{ duration: 1.8, ease: 'easeOut', times: [0, 0.35, 1] }}
      />
      {[0, 0.28].map((d) => (
        <motion.span
          key={d}
          className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/50"
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 1.3, delay: 0.2 + d, ease: EASE_OUT }}
        />
      ))}
      {SPARKS.map((s, i) => {
        const t = { duration: 1.2, delay: s.delay };
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]"
            style={{ width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
            transition={{
              x: { ...t, ease: EASE_OUT },
              y: { ...t, ease: EASE_OUT },
              opacity: { ...t, times: [0, 0.25, 1] },
              scale: { ...t, times: [0, 0.25, 1] },
            }}
          />
        );
      })}
    </div>
  );
}

interface Props {
  room: Room;
  isHost: boolean;
  onNextRound: () => void;
  starting: boolean;
  error?: string | null;
  uid: string | null;
  matches?: MovieCard[]; // New prop for all matches
}

export function MatchScreen({ room, isHost, onNextRound, starting, error, uid, matches }: Props) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  
  // Carousel State
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Close sheet when flipping through movies
  useEffect(() => setSheetOpen(false), [activeIndex]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const handleLeave = async () => {
    if (uid) await leaveRoom(room.id, uid);
    navigate('/');
  };

  // Use all matches if available, otherwise fallback to the single ID in the room
  const displayMovies = matches && matches.length > 0 
    ? matches 
    : [room.deck.find((m) => m.id === room.matchedMovieId)].filter(Boolean) as MovieCard[];

  const movie = displayMovies[activeIndex];

  const nextRoundButton = isHost ? (
    <>
      <button
        onClick={onNextRound}
        disabled={starting}
        className="rounded-full bg-white/10 py-3.5 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/10 backdrop-blur-2xl transition active:scale-[0.97] disabled:opacity-50"
      >
        {starting ? 'Shuffling deck…' : 'Play next round'}
      </button>
      {error && <p role="alert" className="text-sm text-white/60">{error}</p>}
    </>
  ) : (
    <p className="py-2 text-sm text-white/50">Waiting for host to start the next round…</p>
  );

  if (!movie) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-neutral-950 p-6 text-center text-white">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Couldn't load the match</h1>
          <p className="mb-3 text-[15px] text-white/50">Something went out of sync.</p>
          {nextRoundButton}
        </div>
      </div>
    );
  }

  const poster = `https://image.tmdb.org/t/p/w780${movie.posterPath}`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-neutral-950 p-6 text-center">
      {/* Background dynamically updates with transition */}
      <img
        src={poster} alt="" aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-3xl saturate-150 transition-all duration-700"
      />
      <div className="pointer-events-none absolute inset-0 bg-neutral-950/50" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <motion.p
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="text-sm font-medium uppercase tracking-[0.18em] text-white/60"
        >
          {displayMovies.length > 1 ? `You matched on ${displayMovies.length} movies!` : "It's a match"}
        </motion.p>
        
        {/* Pagination Dots */}
        {displayMovies.length > 1 && (
          <div className="mt-4 flex gap-1.5 justify-center z-10 relative">
            {displayMovies.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-5 bg-rose-500' : 'w-1.5 bg-white/25'}`} 
              />
            ))}
          </div>
        )}

        <div className="relative mt-5 w-full">
          {!reduce && <Celebration />}

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="relative w-full overflow-hidden rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/10"
          >
            {/* Glass Arrows for cycling */}
            {displayMovies.length > 1 && (
              <>
                {activeIndex > 0 && (
                  <button 
                    onClick={() => setActiveIndex(i => i - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/20 transition active:scale-95 hover:bg-black/60"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                {activeIndex < displayMovies.length - 1 && (
                  <button 
                    onClick={() => setActiveIndex(i => i + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/20 transition active:scale-95 hover:bg-black/60"
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </>
            )}

            <img src={poster} alt={movie.title} className="aspect-[2/3] w-full object-cover transition-all duration-300" />
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
        </div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.97]"
          >
            Where to watch
          </button>
          {nextRoundButton}
          
          <button
            onClick={handleLeave}
            className="mt-2 text-[13px] font-medium text-white/40 hover:text-white transition-colors"
          >
            Exit Room
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <WatchSheet key="watch" movieId={movie.id} region={room.settings.region} onClose={closeSheet} />
        )}
      </AnimatePresence>
    </div>
  );
}

function WatchSheet({ movieId, region, onClose }: { movieId: number; region: string; onClose: () => void }) {
  const controls = useDragControls();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <motion.div
        key="scrim"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="fixed inset-0 z-20 bg-black/50"
      />
      <motion.div
        key="sheet"
        role="dialog" aria-modal="true" aria-label="Where to watch"
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 600) onClose(); }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={SHEET_SPRING}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md overflow-hidden rounded-t-[2rem] bg-neutral-900/80 text-left ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150"
      >
        <div
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none px-5 pb-3 pt-3 active:cursor-grabbing"
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/25" />
          <h2 className="text-lg font-semibold tracking-tight text-white">Where to watch</h2>
        </div>

        <div className="max-h-[50dvh] min-h-[9rem] overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <ProviderChips movieId={movieId} region={region} />
          <p className="mt-4 text-center text-[11px] leading-snug text-white/40">
            Streaming data powered by JustWatch via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </motion.div>
    </>
  );
}