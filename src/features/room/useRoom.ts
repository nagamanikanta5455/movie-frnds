import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  arrayUnion, collection, doc, onSnapshot, updateDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Direction, MovieCard, Room, SwipeDoc } from '@/types/room';

const FLUSH_MS = 900;

export function useRoom(roomId: string, uid: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  
  // FIX: Tag the swipe docs with their exact round number so they never bleed across rounds
  const [swipeState, setSwipeState] = useState<{ round: number; docs: Record<string, SwipeDoc> }>({ round: 0, docs: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const pending = useRef({ likes: new Set<number>(), supers: new Set<number>(), progress: -1 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const round = room?.round ?? 1;

  // Compute a strict, round-matched swipes object (instantly clears when round bumps)
  const swipes = useMemo(() => {
    return swipeState.round === round ? swipeState.docs : {};
  }, [swipeState, round]);

  useEffect(() => {
    if (!uid) return;
    const unsubRoom = onSnapshot(
      doc(db, 'rooms', roomId),
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          if (snap.metadata.fromCache) return;
          setRoom(null);
        } else {
          setRoom({ id: snap.id, ...snap.data() } as Room);
        }
        setReconnecting(snap.metadata.fromCache);
        setLoading(false);
      },
      (err) => {
        console.error('[room listener]', err);
        setError(err);
        setLoading(false);
      },
    );
    
    const unsubSwipes = onSnapshot(
      collection(db, 'rooms', roomId, 'rounds', String(round), 'swipes'),
      (snap) => {
        const next: Record<string, SwipeDoc> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as SwipeDoc;
        });
        // Update the state WITH the round tag attached
        setSwipeState({ round, docs: next });
      },
      (err) => {
        console.error('[swipes listener error]', err);
        setError(err);
      }
    );
    return () => { unsubRoom(); unsubSwipes(); };
  }, [roomId, uid, round]);

  useEffect(() => {
    pending.current = { likes: new Set(), supers: new Set(), progress: -1 };
  }, [round]);

  // ---- Derived matches ----------------------------------------------------
  const { matches, exhausted, closest } = useMemo(() => {
    if (!room || room.status === 'waiting') return { matches: [], exhausted: false, closest: null };
    
    const finishedIds = room.participantIds.filter((id) => (swipes[id]?.progress ?? 0) >= room.deck.length - 1);
    const likeSets = finishedIds.map((id) => new Set(swipes[id].likes));

    const matches: MovieCard[] = finishedIds.length >= 2
      ? room.deck.filter((m) => likeSets.every((s) => s.has(m.id)))
      : [];

    let closest: MovieCard | null = null;
    if (matches.length === 0 && finishedIds.length > 0) {
      let best = -1;
      for (const m of room.deck) {
        const n = likeSets.filter((s) => s.has(m.id)).length;
        if (n > best) { best = n; closest = m; }
      }
    }

    const isLocalFinished = uid ? finishedIds.includes(uid) : false;
    const exhausted = room.participantIds.length > 1
      ? isLocalFinished && finishedIds.length >= 2
      : isLocalFinished;

    return { matches, exhausted, closest };
  }, [room, swipes, uid]);

  // ---- Wait for EVERYONE to finish before flipping to 'matched' -----------
  const flipping = useRef(false);

  useEffect(() => {
    if (!room || room.status !== 'swiping' || flipping.current) return;

    if (exhausted) {
      flipping.current = true;
      const finalMovieId = matches.length > 0 ? matches[0].id : (closest?.id || room.deck[0]?.id);

      updateDoc(doc(db, 'rooms', roomId), {
        status: 'matched',
        matchedMovieId: finalMovieId,
        matchedAt: serverTimestamp(),
      })
        .catch(console.error)
        .finally(() => { flipping.current = false; });
    }
  }, [room, matches, exhausted, closest, roomId]);
  
  const flush = useCallback(async () => {
    timer.current = null;
    if (!uid) return;
    const snap = pending.current;
    if (snap.progress < 0) return;
    pending.current = { likes: new Set(), supers: new Set(), progress: -1 };

    const payload: Record<string, unknown> = { progress: snap.progress };
    if (snap.likes.size) payload.likes = arrayUnion(...snap.likes);
    if (snap.supers.size) payload.superLikes = arrayUnion(...snap.supers);

    try {
      await setDoc(doc(db, 'rooms', roomId, 'rounds', String(round), 'swipes', uid), payload, { merge: true });
    } catch (e) {
      console.error('[swipe flush failed]', e);
      snap.likes.forEach((id) => pending.current.likes.add(id));
      snap.supers.forEach((id) => pending.current.supers.add(id));
      pending.current.progress = Math.max(pending.current.progress, snap.progress);
      timer.current = setTimeout(flush, FLUSH_MS * 2);
    }
  }, [roomId, uid, round]);

  const recordSwipe = useCallback(
    (movie: MovieCard, dir: Direction, nextIndex: number) => {
      const p = pending.current;
      p.progress = Math.max(p.progress, nextIndex);
      if (dir === 'right' || dir === 'up') p.likes.add(movie.id);
      if (dir === 'up') p.supers.add(movie.id);
      if (!timer.current) timer.current = setTimeout(flush, FLUSH_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      void flush();
    };
  }, [flush]);

  return {
    room, swipes, loading, error, reconnecting,
    matches, exhausted, closest,
    myProgress: uid ? swipes[uid]?.progress ?? 0 : 0,
    recordSwipe,
  };
}