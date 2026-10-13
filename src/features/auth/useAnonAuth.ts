import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, loginAnonymously } from '@/lib/firebase';

export function useAnonAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        loginAnonymously().catch(console.error);
      }
    });
    return unsub;
  }, []);

  return { user, loading };
}