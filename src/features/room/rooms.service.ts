import { arrayRemove, deleteField, doc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withTimeout } from '@/lib/async';
import { buildDeck } from '@/features/tmdb/tmdb.client';
import type { Room } from '@/types/room';

export async function createRoom(
  hostId: string,
  hostName: string,
  settings = { genreIds: [], providerIds: [], region: 'US' },
) {
  // Generate a short 6-character room code
  const roomId = Math.random().toString(36).substring(2, 8).toLowerCase();
  const hue = Math.floor(Math.random() * 360); // Random avatar color

  await setDoc(doc(db, 'rooms', roomId), {
    hostId,
    status: 'waiting',
    settings,
    participantIds: [hostId],
    participants: {
      [hostId]: { name: hostName, hue }
    },
    deck: [],
    matchedMovieId: null,
    createdAt: serverTimestamp()
  });

  return roomId;
}

export async function joinRoom(roomId: string, userId: string, userName: string) {
  const hue = Math.floor(Math.random() * 360);
  await updateDoc(doc(db, 'rooms', roomId), {
    participantIds: arrayUnion(userId),
    [`participants.${userId}`]: { name: userName, hue }
  });
}
export async function pickMovie(roomId: string, movieId: number) {
  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'matched', matchedMovieId: movieId, matchedAt: serverTimestamp(),
    });
  } catch (e: any) {
    if (e?.code !== 'permission-denied') throw e; 
  }
}

export async function startRound(room: Room) {
  const nextRound = (room.round ?? 0) + 1;
  const deck = await withTimeout(
    buildDeck({
      ...room.settings,
      round: nextRound,
      excludeIds: room.deck?.map((m) => m.id) ?? [],
    }),
    12_000,
    'Loading movies',
  );
  if (deck.length === 0) throw new Error('No movies matched these settings.');

  await updateDoc(doc(db, 'rooms', room.id), {
    deck,
    round: nextRound,
    status: 'swiping',
    matchedMovieId: null,
    matchedAt: deleteField(),
  });
}

export async function leaveRoom(roomId: string, uid: string) {
  await updateDoc(doc(db, 'rooms', roomId), {
    participantIds: arrayRemove(uid),
  });
}