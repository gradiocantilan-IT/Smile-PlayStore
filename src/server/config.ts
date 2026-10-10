import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  nodeEnv: string;
  port: number;
  appBaseUrl: string;
  sessionSecret: string;
  maxApkSizeMb: number;
  adminEmailAllowlist: string[];
  adminPassword: string;
  firebase: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    isConfigured: boolean;
  };
  r2: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
    publicBaseUrl?: string;
    isConfigured: boolean;
  };
}

const parseAllowlist = (raw?: string): string[] => {
  const defaults = ['gradiocantilan@gmail.com', 'admin@smilestore.app'];
  if (!raw || !raw.trim()) return defaults;
  const parsed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...defaults, ...parsed]));
};

export const config: ServerConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'smile-store-production-session-secret-key-99',
  maxApkSizeMb: Number(process.env.MAX_APK_SIZE_MB) || 150,
  adminEmailAllowlist: parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST),
  adminPassword: process.env.ADMIN_PASSWORD || 'password123',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'smile-playstore',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
    get isConfigured() {
      return Boolean(this.projectId && this.clientEmail && this.privateKey);
    },
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    get isConfigured() {
      return Boolean(
        this.accountId &&
          this.accessKeyId &&
          this.secretAccessKey &&
          this.bucketName
      );
    },
  },
};
