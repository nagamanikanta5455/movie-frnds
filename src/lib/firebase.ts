import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, browserSessionPersistence, signInAnonymously } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDlnII-arohTlmCoKYhy9zj25PMWoygj_I",
  authDomain: "movie-matcher-1ad1a.firebaseapp.com",
  projectId: "movie-matcher-1ad1a",
  storageBucket: "movie-matcher-1ad1a.firebasestorage.app",
  messagingSenderId: "1007947629106",
  appId: "1:1007947629106:web:a8ae08fef1e21fe784f22b"
};


export const app = initializeApp(firebaseConfig);

function makeAuth() {
  try {
    return initializeAuth(app, { persistence: browserSessionPersistence });
  } catch {
    return getAuth(app);
  }
}

function makeDb() {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const auth = makeAuth();
export const db = makeDb();
export const loginAnonymously = () => signInAnonymously(auth);