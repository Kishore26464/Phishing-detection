import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project used by the Flutter mobile app (phishguard-38c10).
// These are public web client identifiers, not secrets.
const firebaseConfig = {
  apiKey: 'AIzaSyAqKyg1EtTKVagex1TYQg1wLih7bnN4dK4',
  authDomain: 'phishguard-38c10.firebaseapp.com',
  projectId: 'phishguard-38c10',
  storageBucket: 'phishguard-38c10.firebasestorage.app',
  messagingSenderId: '934404827979',
  appId: '1:934404827979:web:90f5dd90f716333ac3d6ce',
  measurementId: 'G-FPMLNMFTYZ',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export type { User };
