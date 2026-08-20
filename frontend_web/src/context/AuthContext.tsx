import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, onAuthChange, signInWithGoogle, signOut, type User } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn() {
    const credential = await signInWithGoogle();
    const u = credential.user;
    // Mirror the profile doc the mobile app maintains at users/{uid}.
    await setDoc(
      doc(db, 'users', u.uid),
      {
        email: u.email,
        name: u.displayName ?? 'User',
        photoUrl: u.photoURL,
        uid: u.uid,
        lastLogin: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function signOutUser() {
    await signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
