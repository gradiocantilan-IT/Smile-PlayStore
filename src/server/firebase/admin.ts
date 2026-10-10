import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { config } from '../config.ts';

let firebaseConfig: {
  projectId?: string;
  firestoreDatabaseId?: string;
  [key: string]: unknown;
} = {};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch {
  // Graceful fallback
}

let firebaseApp: App | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

// Track if Cloud Firestore API is active or disabled in the GCP project
let firestoreApiAvailable = false;
let isProbed = false;
let probePromise: Promise<boolean> | null = null;
let lastDiagnostic = '';
let warnedApiDisabled = false;

export function markFirestoreUnavailable(error: unknown): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  firestoreApiAvailable = false;
  firestoreDb = null;
  isProbed = true;

  if (
    errMsg.includes('Cloud Firestore API has not been used') ||
    errMsg.includes('SERVICE_DISABLED') ||
    errMsg.includes('PERMISSION_DENIED') ||
    errMsg.includes('Missing or insufficient permissions')
  ) {
    lastDiagnostic = `Cloud Firestore is currently unavailable for project "${config.firebase.projectId}". Operating seamlessly via local persistence.`;
    if (!warnedApiDisabled) {
      warnedApiDisabled = true;
      console.warn(`[Firestore Status] ${lastDiagnostic}`);
    }
  } else {
    lastDiagnostic = errMsg;
    if (!warnedApiDisabled) {
      warnedApiDisabled = true;
      console.warn(`[Firestore Status] Notice: ${errMsg}. Operating via local persistence.`);
    }
  }
}

export function shouldAttemptFirestore(): boolean {
  if (!config.firebase.isConfigured) return false;
  return firestoreApiAvailable;
}

export async function isFirestoreOperational(): Promise<boolean> {
  if (!config.firebase.isConfigured) return false;
  if (isProbed) return firestoreApiAvailable;

  if (!probePromise) {
    probePromise = (async () => {
      const { db } = getFirebaseAdmin();
      if (!db) {
        isProbed = true;
        firestoreApiAvailable = false;
        return false;
      }
      try {
        await db.collection('apps').limit(1).get();
        firestoreApiAvailable = true;
      } catch (err: unknown) {
        markFirestoreUnavailable(err);
      } finally {
        isProbed = true;
      }
      return firestoreApiAvailable;
    })();
  }

  return probePromise;
}

export function getFirestoreDiagnostic(): {
  isAvailable: boolean;
  diagnostic: string;
} {
  return {
    isAvailable: firestoreApiAvailable && config.firebase.isConfigured,
    diagnostic: lastDiagnostic || (config.firebase.isConfigured ? 'Ready' : 'Not configured in .env'),
  };
}

export function getFirebaseAdmin(): {
  app: App | null;
  db: Firestore | null;
  auth: Auth | null;
  isConfigured: boolean;
} {
  if (firebaseApp && firestoreDb && firestoreApiAvailable) {
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

    if (!firestoreDb && (!isProbed || firestoreApiAvailable)) {
      if (config.firebase.projectId === firebaseConfig.projectId && firebaseConfig.firestoreDatabaseId) {
        firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      } else {
        firestoreDb = getFirestore(firebaseApp);
      }
    }

    firebaseAuth = getAuth(firebaseApp);

    return {
      app: firebaseApp,
      db: isProbed && !firestoreApiAvailable ? null : firestoreDb,
      auth: firebaseAuth,
      isConfigured: true,
    };
  } catch (err) {
    console.error('Detailed Firebase Admin initialization error:', err);
    return {
      app: null,
      db: null,
      auth: null,
      isConfigured: false,
    };
  }
}
