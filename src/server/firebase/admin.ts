import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { config } from '../config.ts';

let firebaseApp: App | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseAdmin(): {
  app: App | null;
  db: Firestore | null;
  auth: Auth | null;
  isConfigured: boolean;
} {
  if (firebaseApp && firestoreDb) {
    return {
      app: firebaseApp,
      db: firestoreDb,
      auth: firebaseAuth,
      isConfigured: true,
    };
  }

  if (!config.firebase.isConfigured) {
    return {
      app: null,
      db: null,
      auth: null,
      isConfigured: false,
    };
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0]!;
    } else {
      firebaseApp = initializeApp({
        credential: cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
    }

    firestoreDb = getFirestore(
      firebaseApp,
      'ai-studio-smilestoreandroi-83366cfe-f5e8-4f8b-8b5d-b0c430b762b5'
    );
    firebaseAuth = getAuth(firebaseApp);

    return {
      app: firebaseApp,
      db: firestoreDb,
      auth: firebaseAuth,
      isConfigured: true,
    };
  } catch (err) {
    console.error('Firebase Admin initialization failed:', err);
    return {
      app: null,
      db: null,
      auth: null,
      isConfigured: false,
    };
  }
}
