import { memo, useCallback, useEffect, useState } from 'react';
import {
  AnimatePresence, motion, useMotionValue, useTransform, type MotionValue, type PanInfo,
} from 'framer-motion';
import { Bookmark, Heart, Star, X, type LucideIcon } from 'lucide-react';
import type { Direction, MovieCard } from '@/types/room';

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 500;
const VISIBLE = 3;
const PRELOAD_AHEAD = 4;

const img = (path: string | null, size: 'w500' | 'w780' = 'w780') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : '';

const exitVariants = {
  exit: (dir: Direction) => ({
    x: dir === 'left' ? -window.innerWidth : dir === 'right' ? window.innerWidth : 0,
    y: dir === 'up' ? -window.innerHeight : 0,
    opacity: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const snapBack = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 } as const;

interface DeckProps {
  movies: MovieCard[];
  startIndex?: number;
  onSwipe: (movie: MovieCard, dir: Direction, nextIndex: number) => void;
  onToggleWatchlist?: (movie: MovieCard) => void;
  onLeave: () => void;
}

export function SwipeDeck({ movies, startIndex = 0, onSwipe, onToggleWatchlist, onLeave }: DeckProps) {
  const [index, setIndex] = useState(startIndex);
  const [exitDir, setExitDir] = useState<Direction>('right');

  useEffect(() => { setIndex((i) => Math.max(i, startIndex)); }, [startIndex]);

  useEffect(() => {
    movies.slice(index + 1, index + 1 + PRELOAD_AHEAD).forEach((m) => {
      const src = img(m.posterPath);
      if (!src) return;
      const i = new Image();
      i.src = src;
      void i.decode?.().catch(() => {});
    });
  }, [index, movies]);

  const commit = useCallback(
    (dir: Direction) => {
      const movie = movies[index];
      if (!movie) return;
      navigator.vibrate?.(dir === 'up' ? [8, 40, 8] : 8);
      setExitDir(dir);
      setIndex(index + 1);
      onSwipe(movie, dir, index + 1);
    },
    [index, movies, onSwipe],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,[contenteditable]')) return;
      if (e.key === 'ArrowLeft') commit('left');
      else if (e.key === 'ArrowRight') commit('right');
      else if (e.key === 'ArrowUp') commit('up');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit]);

  const visible = movies.slice(index, index + VISIBLE);
  const done = index >= movies.length;

  if (done) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-neutral-950 p-6 text-center text-white">
        <div className="flex w-full max-w-sm flex-col items-center">
          <h2 className="mb-2 text-xl font-semibold tracking-tight">You've seen everything.</h2>
          <p className="mb-10 text-[15px] text-white/50">Waiting for your friend to finish swiping...</p>

          <div className="mb-12 flex space-x-2.5 opacity-60">
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: '0s' }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: '0.15s' }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" style={{ animationDelay: '0.3s' }} />
          </div>

          <button
            onClick={onLeave}
            className="mt-8 text-[13px] font-medium text-white/40 transition-colors hover:text-white"
          >
            Exit Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full select-none flex-col items-center justify-center gap-6 bg-neutral-950 p-6">
      <button
        onClick={onLeave}
        className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+1.25rem)] z-50 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-white/70 backdrop-blur-md ring-1 ring-white/20 transition active:scale-95 hover:bg-white/20 hover:text-white"
      >
        Exit Room
      </button>
      <div className="relative mx-auto aspect-[2/3] max-h-[70vh] w-full max-w-sm flex-1">
        <AnimatePresence custom={exitDir}>
          {visible
            .map((movie, depth) => (
              <Card key={movie.id} movie={movie} depth={depth} isTop={depth === 0} onCommit={commit} />
            ))
            .reverse()}
        </AnimatePresence>

      </div>

      <ActionBar
        disabled={done}
        onPass={() => commit('left')}
        onSuper={() => commit('up')}
        onLike={() => commit('right')}
        onWatchlist={() => movies[index] && onToggleWatchlist?.(movies[index])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface CardProps {
  movie: MovieCard;
  depth: number;
  isTop: boolean;
  onCommit: (dir: Direction) => void;
}

/** Small frosted badge that fades + scales in as you drag toward a threshold. */
function GlassBadge({
  opacity, scale, Icon, className, iconClass, fill,
}: {
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
  Icon: LucideIcon;
  className: string;
  iconClass: string;
  fill?: boolean;
}) {
  return (
    <motion.div
      style={{ opacity, scale }}
      className={`pointer-events-none absolute grid h-16 w-16 place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-2xl backdrop-saturate-150 ${className}`}
    >
      <Icon size={30} strokeWidth={2.5} className={iconClass} fill={fill ? 'currentColor' : 'none'} />
    </motion.div>
  );
}

const Card = memo(function Card({ movie, depth, isTop, onCommit }: CardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [loaded, setLoaded] = useState(false);

  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [24, 120], [0, 1]);
  const likeScale = useTransform(x, [24, 120], [0.6, 1]);
  const nopeOpacity = useTransform(x, [-120, -24], [1, 0]);
  const nopeScale = useTransform(x, [-120, -24], [1, 0.6]);
  const superOpacity = useTransform(y, [-120, -24], [1, 0]);
  const superScale = useTransform(y, [-120, -24], [1, 0.6]);

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const px = offset.x + velocity.x * 0.2;
    const py = offset.y + velocity.y * 0.2;

    if (py < -SWIPE_DISTANCE && Math.abs(py) > Math.abs(px)) return onCommit('up');
    if (px > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) return onCommit('right');
    if (px < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) return onCommit('left');
  };

  return (
    <div
      className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
      style={{
        zIndex: 10 - depth,
        transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`,
        opacity: depth === 2 ? 0.6 : 1,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
    >
      <motion.div
        className="relative h-full w-full cursor-grab touch-none overflow-hidden rounded-[2rem] bg-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/10 active:cursor-grabbing"
        style={{ x, y, rotate }}
        drag={isTop}
        dragSnapToOrigin
        dragElastic={0.9}
        dragTransition={{ bounceStiffness: 420, bounceDamping: 30 }}
        transition={snapBack}
        whileDrag={{ scale: 1.02 }}
        onDragEnd={handleDragEnd}
        variants={exitVariants}
        exit="exit"
      >
        {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-800 to-neutral-900" />}
        <img
          src={img(movie.posterPath)}
          alt={movie.title}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Shorter scrim: only the bottom ~45%; the glass panel carries legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-black/25 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="truncate text-xl font-semibold tracking-tight text-white">{movie.title}</h2>
            <span className="shrink-0 text-sm tabular-nums text-white/60">{movie.year}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/70">{movie.overview}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium tabular-nums text-white/80">
            <Star size={12} fill="currentColor" /> {movie.rating.toFixed(1)}
          </span>
        </div>

        <GlassBadge opacity={likeOpacity} scale={likeScale} Icon={Heart} fill
          className="left-6 top-8" iconClass="text-rose-400" />
        <GlassBadge opacity={nopeOpacity} scale={nopeScale} Icon={X}
          className="right-6 top-8" iconClass="text-white" />
        <GlassBadge opacity={superOpacity} scale={superScale} Icon={Star} fill
          className="left-1/2 top-1/3 -translate-x-1/2" iconClass="text-white" />
      </motion.div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */

function ActionBar(props: {
  disabled: boolean;
  onPass: () => void; onSuper: () => void; onLike: () => void; onWatchlist: () => void;
}) {
  const btn = 'grid place-items-center rounded-full transition-colors disabled:opacity-30';
  return (
    <div className="pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-1 rounded-full bg-white/10 p-1.5 ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150">
        <motion.button whileTap={{ scale: 0.88 }} disabled={props.disabled} onClick={props.onPass}
          aria-label="Pass" className={`${btn} h-14 w-14 text-white/80 hover:bg-white/10`}>
          <X size={26} strokeWidth={2.5} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.88 }} disabled={props.disabled} onClick={props.onSuper}
          aria-label="Super like" className={`${btn} h-11 w-11 text-white/70 hover:bg-white/10`}>
          <Star size={20} fill="currentColor" />
        </motion.button>
        {/* The one accent in the bar */}
        <motion.button whileTap={{ scale: 0.88 }} disabled={props.disabled} onClick={props.onLike}
          aria-label="Like" className={`${btn} h-14 w-14 bg-rose-500 text-white hover:bg-rose-400`}>
          <Heart size={26} fill="currentColor" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.88 }} onClick={props.onWatchlist}
          aria-label="Save to watchlist" className={`${btn} h-11 w-11 text-white/70 hover:bg-white/10`}>
          <Bookmark size={20} />
        </motion.button>
      </div>
    </div>
  );
}