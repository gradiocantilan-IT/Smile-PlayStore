import fs from 'fs';
import path from 'path';
import { config } from '../config.ts';
import { RestFirestore } from './restClient.ts';

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

let firestoreDb: any = null; // Will hold RestFirestore instance

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
  lastDiagnostic = errMsg;
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
  app: any;
  db: any;
  auth: any;
  isConfigured: boolean;
} {
  if (firestoreDb && firestoreApiAvailable) {
    return {
      app: null,
      db: firestoreDb,
      auth: null, // REST client doesn't support Auth
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
    if (!firestoreDb && (!isProbed || firestoreApiAvailable)) {
      firestoreDb = new RestFirestore(config.firebase.projectId!, firebaseConfig.firestoreDatabaseId || 'default');
    }

    return {
      app: null,
      db: isProbed && !firestoreApiAvailable ? null : firestoreDb,
      auth: null,
      isConfigured: true,
    };
  } catch (err) {
    console.error('Detailed REST Firestore initialization error:', err);
    return {
      app: null,
      db: null,
      auth: null,
      isConfigured: false,
    };
  }
}
