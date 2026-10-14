import type { Timestamp } from 'firebase/firestore';

export type RoomStatus = 'waiting' | 'swiping' | 'matched';

export interface MovieCard {
  id: number;
  title: string;
  year: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number;
  genreIds: number[];
}

export interface Room {
  id: string;
  hostId: string;
  status: RoomStatus;
  settings: { genreIds: number[]; providerIds: number[]; region: string };
  participantIds: string[];
  participants: Record<string, { name: string; hue: number }>;
  deck: MovieCard[];
  matchedMovieId: number | null;
  matchedMovieIds?: number[];
  round?: number;
  createdAt: Timestamp;
}

export interface SwipeDoc {
  likes: number[];
  superLikes: number[];
  progress: number;
  round?: number;
}

export type Direction = 'left' | 'right' | 'up';