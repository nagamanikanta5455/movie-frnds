import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clapperboard } from 'lucide-react';
import { useAnonAuth } from '@/features/auth/useAnonAuth';
import { Screen, glassInput, primaryBtn } from '@/components/Screen';
import { parseRoomCode } from '@/lib/roomCode';
import { getSavedName, saveName } from '@/lib/storage';
import { createRoom } from './rooms.service';

const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAnonAuth();
const uid = user?.uid;

  // Create
  const [name, setName] = useState(getSavedName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const canCreate = !!uid && name.trim().length > 0 && !busy;
  const canJoin = code.trim().length > 0;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canCreate || !uid) return;
    setBusy(true);
    setError(null);
    try {
      const clean = name.trim();
      saveName(clean);
      const roomId = await createRoom(uid, clean);
      navigate(`/r/${roomId}`);
    } catch {
      setError("Couldn't create the room. Check your connection and try again.");
      setBusy(false);
    }
  }

  function onJoin(e: FormEvent) {
    e.preventDefault();
    if (!canJoin) return;
    const roomId = parseRoomCode(code);
    if (!roomId) {
      setCodeError("That doesn't look like a room code or link.");
      return;
    }
    const clean = name.trim();
    if (clean) saveName(clean);

    navigate(`/r/${roomId}`);
  }

  return (
    <Screen>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex flex-col items-center text-center"
      >
        <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur-2xl backdrop-saturate-150">
          <Clapperboard size={28} strokeWidth={1.75} className="text-white" />
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Movie Night</h1>
        <p className="mt-2 max-w-[17rem] text-[15px] leading-snug text-white/50">
          Swipe together. Find something you all want to watch.
        </p>

        {/* Create */}
        <form onSubmit={onCreate} className="mt-10 w-full space-y-3">
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
          <button type="submit" disabled={!canCreate} className={primaryBtn}>
            {busy ? 'Creating…' : 'Create room'}
          </button>
          {error && <p role="alert" className="pt-1 text-sm text-white/60">{error}</p>}
        </form>

        {/* Divider */}
        <div className="my-8 flex w-full items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-medium uppercase tracking-wider text-white/30">or join a room</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* Join */}
        <form onSubmit={onJoin} noValidate className="w-full text-left">
          <label
            htmlFor="room-code"
            className="mb-2 block px-1 text-xs font-medium uppercase tracking-wider text-white/40"
          >
            Enter room code
          </label>
          <div className="relative">
            <input
              id="room-code"
              value={code}
              onChange={(e) => { setCode(e.target.value); if (codeError) setCodeError(null); }}
              placeholder="Paste a code or invite link"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-invalid={!!codeError}
              aria-describedby={codeError ? 'room-code-error' : undefined}
              className={glassInput}
              style={{ paddingRight: 56 }} // room for the arrow button
            />
            <button
              type="submit"
              disabled={!canJoin}
              aria-label="Join room"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-black transition active:scale-90 disabled:bg-white/10 disabled:text-white/30 disabled:active:scale-100"
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
          {codeError && (
            <p id="room-code-error" role="alert" className="mt-2 px-1 text-sm text-white/60">
              {codeError}
            </p>
          )}
        </form>

        <p className="mt-8 text-xs text-white/30">No sign-up. Just share the link.</p>
      </motion.div>
    </Screen>
  );
}