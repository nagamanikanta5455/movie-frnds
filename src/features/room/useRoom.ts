import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  arrayUnion, collection, doc, onSnapshot, updateDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Direction, MovieCard, Room, SwipeDoc } from '@/types/room';

const FLUSH_MS = 900;

export function useRoom(roomId: string, uid: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [swipes, setSwipes] = useState<Record<string, SwipeDoc>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

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
      collection(db, 'rooms', roomId, 'swipes'),
      (snap) => {
        const next: Record<string, SwipeDoc> = {};
        snap.forEach((d) => (next[d.id] = d.data() as SwipeDoc));
        setSwipes(next);
      },
      setError,
    );
    return () => { unsubRoom(); unsubSwipes(); };
  }, [roomId, uid]);

  const { matches, exhausted, closest } = useMemo(() => {
    if (!room || room.status === 'waiting') return { matches: [], exhausted: false, closest: null };
    const ids = room.participantIds;
    const likeSets = ids.map((id) => new Set(swipes[id]?.likes ?? []));

    const matches: MovieCard[] =
      ids.length >= 2 && ids.every((id) => swipes[id])
        ? room.deck.filter((m) => likeSets.every((s) => s.has(m.id)))
        : [];

    const exhausted =
      ids.length > 0 && ids.every((id) => (swipes[id]?.progress ?? 0) >= room.deck.length);

    let closest: MovieCard | null = null;
    // We removed 'exhausted &&' so it ALWAYS tracks the best match in real-time
    if (matches.length === 0) {
      let best = 0;
      for (const m of room.deck) {
        const n = likeSets.filter((s) => s.has(m.id)).length;
        if (n > best) { best = n; closest = m; }
      }
    }
    return { matches, exhausted, closest };
  }, [room, swipes]);

  const flipping = useRef(false);
  useEffect(() => {
    if (!room || room.status !== 'swiping' || matches.length === 0 || flipping.current) return;
    flipping.current = true;
    const ref = doc(db, 'rooms', roomId);
    
    updateDoc(ref, {
      status: 'matched',
      matchedMovieId: matches[0].id,
      matchedAt: serverTimestamp(),
    }).catch(console.error).finally(() => { flipping.current = false; });
  }, [room, matches, roomId]);
  const pending = useRef({ likes: new Set<number>(), supers: new Set<number>(), progress: -1 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      await setDoc(doc(db, 'rooms', roomId, 'swipes', uid), payload, { merge: true });
    } catch (e) {
      snap.likes.forEach((id) => pending.current.likes.add(id));
      snap.supers.forEach((id) => pending.current.supers.add(id));
      pending.current.progress = Math.max(pending.current.progress, snap.progress);
      timer.current = setTimeout(flush, FLUSH_MS * 2);
    }
  }, [roomId, uid]);

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