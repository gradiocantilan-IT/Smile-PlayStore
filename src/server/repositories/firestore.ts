import fs from 'fs';
import path from 'path';
import type { Query, DocumentData } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../firebase/admin.ts';
import {
  AppRecord,
  AppStatus,
  CategoryRecord,
  CmsSettings,
  AuditLogRecord,
  AdminUser,
} from '../../types/index.ts';

// Default CMS settings
const DEFAULT_CMS_SETTINGS: CmsSettings = {
  siteName: 'Smile PlayStore',
  tagline: 'Android App Marketplace',
  announcement: '',
  maxUploadSizeMb: 150,
  allowedCategories: [
    'Tools & Utilities',
    'Productivity',
    'Communication',
    'Entertainment',
    'Education',
    'Finance',
    'Health & Fitness',
    'Lifestyle',
  ],
  contactEmail: 'security@smilestore.app',
  maintenanceMode: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

// Local storage path for dev persistence
const DATA_DIR = path.resolve(process.cwd(), '.data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'smile_store_db.json');

interface LocalDatabaseSchema {
  apps: Record<string, AppRecord>;
  categories: Record<string, CategoryRecord>;
  cmsSettings: CmsSettings;
  auditLogs: AuditLogRecord[];
  users: Record<string, AdminUser>;
}

function loadLocalStore(): LocalDatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(LOCAL_STORE_FILE)) {
    try {
      const data = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Fallback
    }
  }

  // Start with STRICTLY EMPTY marketplace as required by spec!
  // Absolutely no dummy apps, fake reviews, or seeded application records.
  const initialSchema: LocalDatabaseSchema = {
    apps: {},
    categories: {},
    cmsSettings: DEFAULT_CMS_SETTINGS,
    auditLogs: [],
    users: {},
  };

  saveLocalStore(initialSchema);
  return initialSchema;
}

function saveLocalStore(data: LocalDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local database file:', err);
  }
}

export class AppRepository {
  /**
   * Returns whether database is connected to live production Firestore
   */
  static isFirestoreLive(): boolean {
    const { isConfigured, db } = getFirebaseAdmin();
    return Boolean(isConfigured && db);
  }

  static getDatabaseMode(): 'production_firestore' | 'local_persistent_file' {
    return this.isFirestoreLive() ? 'production_firestore' : 'local_persistent_file';
  }

  // ---------------------------------------------------------------------------
  // APPS
  // ---------------------------------------------------------------------------

  static async getPublishedApps(filters?: {
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<AppRecord[]> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        let query: Query<DocumentData> = db
          .collection('apps')
          .where('status', '==', 'published')
          .where('signatureVerified', '==', true);

        if (filters?.category && filters.category !== 'All') {
          query = query.where('category', '==', filters.category);
        }

        const snapshot = await query.limit(filters?.limit || 50).get();
        let apps: AppRecord[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as AppRecord));

        if (filters?.search) {
          const s = filters.search.toLowerCase();
          apps = apps.filter(
            (a: AppRecord) =>
              a.title.toLowerCase().includes(s) ||
              a.developerName.toLowerCase().includes(s) ||
              a.packageName.toLowerCase().includes(s) ||
              a.category.toLowerCase().includes(s)
          );
        }

        return apps.sort((a: AppRecord, b: AppRecord) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
      } catch (err) {
        console.error('Firestore getPublishedApps error:', err);
      }
    }

    // Local store
    const store = loadLocalStore();
    let apps = Object.values(store.apps).filter(
      (a) => a.status === 'published' && a.signatureVerified === true
    );

    if (filters?.category && filters.category !== 'All') {
      apps = apps.filter((a) => a.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.title.toLowerCase().includes(s) ||
          a.developerName.toLowerCase().includes(s) ||
          a.packageName.toLowerCase().includes(s) ||
          a.category.toLowerCase().includes(s)
      );
    }

    return apps.sort(
      (a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
    );
  }

  static async getAppBySlug(slug: string): Promise<AppRecord | null> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const snapshot = await db.collection('apps').where('slug', '==', slug).limit(1).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() } as AppRecord;
        }
      } catch (err) {
        console.error('Firestore getAppBySlug error:', err);
      }
    }

    const store = loadLocalStore();
    const app = Object.values(store.apps).find((a) => a.slug === slug);
    return app || null;
  }

  static async getAppById(id: string): Promise<AppRecord | null> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const doc = await db.collection('apps').doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as AppRecord;
        }
      } catch (err) {
        console.error('Firestore getAppById error:', err);
      }
    }

    const store = loadLocalStore();
    return store.apps[id] || null;
  }

  static async getAllAppsForAdmin(status?: AppStatus): Promise<AppRecord[]> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        let query: Query<DocumentData> = db.collection('apps');
        if (status) {
          query = query.where('status', '==', status);
        }
        const snapshot = await query.limit(100).get();
        const apps: AppRecord[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as AppRecord));
        return apps.sort((a: AppRecord, b: AppRecord) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } catch (err) {
        console.error('Firestore getAllAppsForAdmin error:', err);
      }
    }

    const store = loadLocalStore();
    let apps = Object.values(store.apps);
    if (status) {
      apps = apps.filter((a) => a.status === status);
    }
    return apps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  static async createApp(
    data: Omit<AppRecord, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>
  ): Promise<AppRecord> {
    const now = new Date().toISOString();
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newApp: AppRecord = {
      ...data,
      id,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { db } = getFirebaseAdmin();
    if (db) {
      try {
        await db.collection('apps').doc(id).set(newApp);
        return newApp;
      } catch (err) {
        console.error('Firestore createApp error:', err);
      }
    }

    const store = loadLocalStore();
    store.apps[id] = newApp;
    saveLocalStore(store);
    return newApp;
  }

  static async updateApp(id: string, updates: Partial<AppRecord>): Promise<AppRecord | null> {
    const now = new Date().toISOString();
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const docRef = db.collection('apps').doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
          const updated = {
            ...doc.data(),
            ...updates,
            updatedAt: now,
          } as AppRecord;
          await docRef.set(updated, { merge: true });
          return updated;
        }
      } catch (err) {
        console.error('Firestore updateApp error:', err);
      }
    }

    const store = loadLocalStore();
    const existing = store.apps[id];
    if (!existing) return null;

    const updated: AppRecord = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    store.apps[id] = updated;
    saveLocalStore(store);
    return updated;
  }

  static async deleteApp(id: string): Promise<boolean> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        await db.collection('apps').doc(id).delete();
        return true;
      } catch (err) {
        console.error('Firestore deleteApp error:', err);
      }
    }

    const store = loadLocalStore();
    if (store.apps[id]) {
      delete store.apps[id];
      saveLocalStore(store);
      return true;
    }
    return false;
  }

  static async incrementAppDownloadCount(id: string): Promise<number> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const docRef = db.collection('apps').doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
          const current = (doc.data()?.downloadCount || 0) + 1;
          await docRef.update({ downloadCount: current });
          return current;
        }
      } catch (err) {
        console.error('Firestore incrementAppDownloadCount error:', err);
      }
    }

    const store = loadLocalStore();
    const app = store.apps[id];
    if (app) {
      app.downloadCount = (app.downloadCount || 0) + 1;
      saveLocalStore(store);
      return app.downloadCount;
    }
    return 1;
  }

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------

  static async getCategories(): Promise<CategoryRecord[]> {
    // Derive categories strictly from published apps
    const publishedApps = await this.getPublishedApps();
    const categoryCountMap = new Map<string, number>();

    for (const app of publishedApps) {
      if (app.category) {
        categoryCountMap.set(app.category, (categoryCountMap.get(app.category) || 0) + 1);
      }
    }

    const result: CategoryRecord[] = [];
    categoryCountMap.forEach((count, name) => {
      result.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        appCount: count,
      });
    });

    return result.sort((a, b) => b.appCount - a.appCount);
  }

  // ---------------------------------------------------------------------------
  // CMS SETTINGS
  // ---------------------------------------------------------------------------

  static async getCmsSettings(): Promise<CmsSettings> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const doc = await db.collection('cmsSettings').doc('global').get();
        if (doc.exists) {
          return doc.data() as CmsSettings;
        }
      } catch (err) {
        console.error('Firestore getCmsSettings error:', err);
      }
    }

    const store = loadLocalStore();
    return store.cmsSettings || DEFAULT_CMS_SETTINGS;
  }

  static async updateCmsSettings(
    updates: Partial<CmsSettings>,
    updatedBy: string
  ): Promise<CmsSettings> {
    const now = new Date().toISOString();
    const current = await this.getCmsSettings();
    const updated: CmsSettings = {
      ...current,
      ...updates,
      updatedAt: now,
      updatedBy,
    };

    const { db } = getFirebaseAdmin();
    if (db) {
      try {
        await db.collection('cmsSettings').doc('global').set(updated, { merge: true });
        return updated;
      } catch (err) {
        console.error('Firestore updateCmsSettings error:', err);
      }
    }

    const store = loadLocalStore();
    store.cmsSettings = updated;
    saveLocalStore(store);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOGS
  // ---------------------------------------------------------------------------

  static async addAuditLog(log: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord> {
    const entry: AuditLogRecord = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    const { db } = getFirebaseAdmin();
    if (db) {
      try {
        await db.collection('auditLogs').doc(entry.id).set(entry);
        return entry;
      } catch (err) {
        console.error('Firestore addAuditLog error:', err);
      }
    }

    const store = loadLocalStore();
    store.auditLogs.unshift(entry);
    // Keep last 500 logs
    if (store.auditLogs.length > 500) {
      store.auditLogs = store.auditLogs.slice(0, 500);
    }
    saveLocalStore(store);
    return entry;
  }

  static async getAuditLogs(limitCount = 100): Promise<AuditLogRecord[]> {
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const snapshot = await db
          .collection('auditLogs')
          .orderBy('timestamp', 'desc')
          .limit(limitCount)
          .get();
        return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as AuditLogRecord));
      } catch (err) {
        console.error('Firestore getAuditLogs error:', err);
      }
    }

    const store = loadLocalStore();
    return (store.auditLogs || []).slice(0, limitCount);
  }

  // ---------------------------------------------------------------------------
  // ADMIN USERS
  // ---------------------------------------------------------------------------

  static async getUserByEmail(email: string): Promise<AdminUser | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const { db } = getFirebaseAdmin();

    if (db) {
      try {
        const snapshot = await db
          .collection('users')
          .where('email', '==', normalizedEmail)
          .limit(1)
          .get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { uid: doc.id, ...doc.data() } as AdminUser;
        }
      } catch (err) {
        console.error('Firestore getUserByEmail error:', err);
      }
    }

    const store = loadLocalStore();
    return store.users[normalizedEmail] || null;
  }

  static async upsertUser(user: Partial<AdminUser> & { email: string }): Promise<AdminUser> {
    const normalizedEmail = user.email.toLowerCase().trim();
    const now = new Date().toISOString();
    const existing = await this.getUserByEmail(normalizedEmail);

    const updatedUser: AdminUser = {
      uid: existing?.uid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      email: normalizedEmail,
      role: user.role || existing?.role || 'admin',
      createdAt: existing?.createdAt || now,
      lastLoginAt: now,
    };

    const { db } = getFirebaseAdmin();
    if (db) {
      try {
        await db.collection('users').doc(updatedUser.uid).set(updatedUser, { merge: true });
        return updatedUser;
      } catch (err) {
        console.error('Firestore upsertUser error:', err);
      }
    }

    const store = loadLocalStore();
    store.users[normalizedEmail] = updatedUser;
    saveLocalStore(store);
    return updatedUser;
  }
}
