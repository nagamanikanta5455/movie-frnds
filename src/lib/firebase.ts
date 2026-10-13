import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDlnII-arohTlmCoKYhy9zj25PMWoygj_I",
  authDomain: "movie-matcher-1ad1a.firebaseapp.com",
  projectId: "movie-matcher-1ad1a",
  storageBucket: "movie-matcher-1ad1a.firebasestorage.app",
  messagingSenderId: "1007947629106",
  appId: "1:1007947629106:web:a8ae08fef1e21fe784f22b"
};


export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const loginAnonymously = () => signInAnonymously(auth);