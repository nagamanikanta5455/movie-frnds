import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clapperboard } from 'lucide-react';
import { useAnonAuth } from '@/features/auth/useAnonAuth';
import { Screen, glassInput, primaryBtn } from '@/components/Screen';
import { createRoom } from './rooms.service';

const NAME_KEY = 'mnm:name';
const readName = () => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
const saveName = (n: string) => { try { localStorage.setItem(NAME_KEY, n); } catch { /* private mode */ } };

const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAnonAuth();
  const uid = user?.uid;
  const [name, setName] = useState(readName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!uid && name.trim().length > 0 && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !uid) return;
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

  return (
    <Screen>
      <motion.form
        onSubmit={onSubmit}
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
            {busy ? 'Creating…' : 'Create room'}
          </button>
          {error && <p role="alert" className="pt-1 text-sm text-white/60">{error}</p>}
        </div>

        <p className="mt-6 text-xs text-white/30">No sign-up. Just share the link.</p>
      </motion.form>
    </Screen>
  );
}