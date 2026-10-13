import { motion } from 'framer-motion';
import type { MovieCard, Room } from '@/types/room';
import { pickMovie } from '@/features/room/rooms.service';

export function NoMatchScreen({ room, closest, likeCount, isHost, onNextRound, starting }: {
  room: Room; closest: MovieCard | null; likeCount: number; isHost: boolean; onNextRound: () => void; starting: boolean;
}) {
  const total = room.participantIds.length;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="mx-auto flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6 text-center"
    >
      {closest ? (
        <>
          <h2 className="text-3xl font-bold text-white">No perfect match</h2>
          <p className="text-white/60">But {likeCount} of {total} of you liked this one:</p>
          <img src={`https://image.tmdb.org/t/p/w500${closest.posterPath}`} alt={closest.title}
               className="w-56 rounded-3xl shadow-2xl ring-1 ring-white/10" />
          <button onClick={() => pickMovie(room.id, closest.id)}
                  className="rounded-full bg-white px-8 py-4 font-bold text-black transition active:scale-95 hover:bg-neutral-200">
            Watch {closest.title}
          </button>
        </>
      ) : (
        <>
          <h2 className="text-3xl font-bold text-white">Tough crowd 😅</h2>
          <div className="mt-4">
        {isHost ? (
          <button onClick={onNextRound} disabled={starting} className="rounded-full bg-white px-8 py-4 font-bold text-black transition active:scale-95 hover:bg-neutral-200 disabled:opacity-50">
            {starting ? 'Shuffling...' : 'Play Next Round'}
          </button>
        ) : (
          <p className="text-white/50">Waiting for host...</p>
        )}
      </div>
          <p className="text-white/60">Nobody liked anything. Try different genres next round.</p>
        </>
      )}
    </motion.div>
  );
}