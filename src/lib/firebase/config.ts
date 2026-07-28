import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
// ponytail: third-party iframe embeds (e.g. the portfolio sandbox viewer) can have
// IndexedDB/localStorage blocked by storage partitioning, which otherwise hangs
// onAuthStateChanged forever. Falling through to in-memory persistence keeps auth working.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
});
export const storage = getStorage(app);

isSupported().then((supported) => {
  if (supported) getAnalytics(app);
});
