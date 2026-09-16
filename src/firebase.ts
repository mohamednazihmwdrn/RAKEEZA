import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const customDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Cloud Firestore with auto-detect long polling to prevent 10s backend connection timeouts
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    customDatabaseId
  );
} catch {
  firestoreInstance = customDatabaseId && customDatabaseId !== '(default)'
    ? getFirestore(app, customDatabaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;
export default db;
