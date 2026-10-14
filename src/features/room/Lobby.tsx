import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Share2 } from 'lucide-react';
import { useAnonAuth } from '@/features/auth/useAnonAuth';
import { Screen, glassInput, primaryBtn, secondaryBtn } from '@/components/Screen';
import { SwipeDeck } from '@/features/swipe/SwipeDeck';
import { MatchScreen } from '@/features/match/MatchScreen';
import { NoMatchScreen } from '@/features/match/NoMatchScreen';
import { friendlyError } from '@/lib/async';
import { useCopy } from '@/lib/copy';
import { getSavedName, saveName } from '@/lib/storage';
import type { MovieCard, Room, SwipeDoc } from '@/types/room';
import { useRoom } from './useRoom';
import { joinRoom, pickMovie, startRound } from './rooms.service';

const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;

/** Most-liked title so far, used by the deck's "Reveal top pick" button. */
function mostLiked(room: Room, swipes: Record<string, SwipeDoc>): MovieCard | null {
  let best: MovieCard | null = null;
  let bestN = 0;
  for (const m of room.deck) {
    const n = Object.values(swipes).filter((s) => s.likes?.includes(m.id)).length;
    if (n > bestN) { best = m; bestN = n; }
  }
  return best;
}

export function Lobby() {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const { user } = useAnonAuth();
  const uid = user?.uid as string;
  const { room, swipes, loading, matches, exhausted, closest, myProgress, recordSwipe } =
    useRoom(roomId, uid);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!room || starting) return;
    setStarting(true);
    setError(null);
    try {
      await startRound(room);
    } catch (e) {
      console.error('[startRound]', e);
      setError(friendlyError(e));
    } finally {
      setStarting(false);
    }
  }

  // ---- Loading / not found -------------------------------------------------
  if (loading || !uid) {
    return (
      <Screen>
        <div className="mx-auto h-16 w-16 animate-pulse rounded-[1.4rem] bg-white/10" />
      </Screen>
    );
  }
  if (!room) return <Closed title="Room not found" body="This link may have expired." />;

  const isMember = room.participantIds.includes(uid);
  const isHost = room.hostId === uid;

  // ---- Not in the room yet -------------------------------------------------
  if (!isMember) {
    if (room.status !== 'waiting') {
      return <Closed title="Already started" body="This room is mid-game. Ask the host for a new link." />;
    }
    return <NameGate room={room} uid={uid} />;
  }

  // ---- Game screens (unchanged components) ---------------------------------
  if (room.status === 'matched') {
    return <MatchScreen room={room} isHost={isHost} onNextRound={handleStart} starting={starting} />;
  }

  if (room.status === 'swiping') {
    if (exhausted && matches.length === 0) {
      const likeCount = closest
        ? Object.values(swipes).filter((s) => s.likes?.includes(closest.id)).length
        : 0;
      return (
    <div className="grid min-h-[100dvh] place-items-center bg-neutral-950 p-6">
      <NoMatchScreen 
        room={room} 
        closest={closest} 
        likeCount={likeCount} 
        isHost={isHost} 
        onNextRound={handleStart} 
        starting={starting} 
      />
    </div>
  );
    }
    return (
      <SwipeDeck
        movies={room.deck}
        startIndex={myProgress}
        onSwipe={recordSwipe}
        onEmpty={() => {
          const top = mostLiked(room, swipes);
          if (top) void pickMovie(room.id, top.id);
        }}
      />
    );
  }

  // ---- Waiting room --------------------------------------------------------
  return (
    <WaitingRoom
      room={room}
      uid={uid}
      isHost={isHost}
      starting={starting}
      error={error}
      onStart={handleStart}
    />
  );
}

/* -------------------------------------------------------------------------- */

function Avatar({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white ring-1 ring-inset ring-white/20"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${hue} 60% 40%))`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function Badge({ children, strong }: { children: string; strong?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        strong ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
      }`}
    >
      {children}
    </span>
  );
}

function Closed({ title, body }: { title: string; body: string }) {
  const navigate = useNavigate();
  return (
    <Screen>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] text-white/50">{body}</p>
        <button onClick={() => navigate('/')} className={`${primaryBtn} mt-8`}>
          Create a new room
        </button>
      </div>
    </Screen>
  );
}

/* ------------------------------ Name Gate --------------------------------- */

function NameGate({ room, uid }: { room: Room; uid: string }) {
  const [name, setName] = useState(getSavedName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hostName = room.participants[room.hostId]?.name ?? 'A friend';
  const canSubmit = name.trim().length > 0 && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const clean = name.trim();
      saveName(clean);
      await joinRoom(room.id, uid, clean);
    } catch {
      setError("Couldn't join. The room may have started.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex flex-col items-center text-center"
      >
        <Avatar name={hostName} hue={room.participants[room.hostId]?.hue ?? 210} size={64} />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">You're invited</h1>
        <p className="mt-2 text-[15px] text-white/50">
          {hostName} wants to pick a movie with you.
        </p>

        <div className="mt-10 w-full space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            autoFocus
            autoComplete="given-name"
            enterKeyHint="go"
            aria-label="Your name"
            className={glassInput}
          />
          <button type="submit" disabled={!canSubmit} className={primaryBtn}>
            {busy ? 'Joining…' : 'Join room'}
          </button>
          {error && <p role="alert" className="pt-1 text-sm text-white/60">{error}</p>}
        </div>
      </motion.form>
    </Screen>
  );
}

/* ----------------------------- Waiting Room ------------------------------- */

function WaitingRoom({
  room, uid, isHost, starting, error, onStart,
}: {
  room: Room; uid: string; isHost: boolean; starting: boolean; error: string | null; onStart: () => void;
}) {
  const { copied: codeCopied, copy: copyCode } = useCopy(2000);
  const link = window.location.href;
  const count = room.participantIds.length;
  const hostName = room.participants[room.hostId]?.name ?? 'the host';

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Movie Night', text: 'Join my movie night', url: link });
      } else {
        await copyCode(link);
      }
    } catch { /* share sheet dismissed */ }
  }

  return (
    <Screen>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex flex-col items-center text-center"
      >
        <div className="mt-6 mb-8 flex flex-col items-center">
          <p
            aria-live="polite"
            className={`text-sm font-medium uppercase tracking-[0.18em] transition-colors ${
              codeCopied ? 'text-white' : 'text-white/50'
            }`}
          >
            {codeCopied ? 'Copied!' : 'Room code · tap to copy'}
          </p>

          <h1 className="mt-2">
            <button
              type="button"
              onClick={() => copyCode(room.id)}
              aria-label={codeCopied ? 'Room code copied' : `Copy room code ${room.id}`}
              className="inline-flex items-center gap-3 rounded-2xl px-3 py-1 transition active:scale-[0.97]"
            >
              <span className="text-5xl font-semibold tabular-nums tracking-[0.12em]">{room.id}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 ring-1 ring-inset ring-white/10">
                <AnimatePresence mode="wait" initial={false}>
                  {codeCopied ? (
                    <motion.span
                      key="ok"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="text-white"
                    >
                      <Check size={16} strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Copy size={16} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          </h1>
        </div>

        <button onClick={share} className={`${secondaryBtn} mt-6 flex items-center justify-center gap-2`}>
          <AnimatePresence mode="wait" initial={false}>
            {codeCopied ? (
              <motion.span key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
                <Check size={16} /> Link copied
              </motion.span>
            ) : (
              <motion.span key="share" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
                <Share2 size={16} /> Invite friends
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <p className="mb-2 mt-10 w-full px-1 text-left text-xs font-medium uppercase tracking-wider text-white/40">
          In the room · {count}
        </p>

        <ul className="w-full overflow-hidden rounded-3xl bg-white/5 ring-1 ring-inset ring-white/10 backdrop-blur-2xl backdrop-saturate-150">
          <AnimatePresence initial={false}>
            {room.participantIds.map((id) => {
              const p = room.participants[id] ?? { name: 'Guest', hue: 210 };
              return (
                <motion.li
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING}
                  className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                >
                  <Avatar name={p.name} hue={p.hue} />
                  <span className="min-w-0 flex-1 truncate text-left text-[16px] font-medium">{p.name}</span>
                  {id === room.hostId && <Badge>Host</Badge>}
                  {id === uid && <Badge strong>You</Badge>}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <div className="mt-8 w-full">
          {isHost ? (
            <>
              <button onClick={onStart} disabled={count < 2 || starting} className={primaryBtn}>
                {starting ? 'Building deck…' : 'Start swiping'}
              </button>
              {count < 2 && (
                <p className="mt-3 text-sm text-white/40">Waiting for at least one friend to join…</p>
              )}
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-white/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
              Waiting for {hostName} to start
            </p>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-white/60">{error}</p>}
        </div>
      </motion.div>
    </Screen>
  );
}