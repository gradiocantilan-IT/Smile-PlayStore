export type AppStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';

export interface AppRecord {
  id: string;
  slug: string;
  title: string;
  developerName: string;
  description: string;
  category: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  iconObjectKey: string;
  iconUrl?: string;
  apkObjectKey: string;
  apkSha256: string;
  apkSizeBytes: number;
  signingCertificateSha256: string;
  signatureVerified: boolean;
  signatureScheme?: 'v1' | 'v2' | 'v3' | 'v2+v3' | 'unsigned';
  permissions: string[];
  minSdk?: number;
  targetSdk?: number;
  status: AppStatus;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  appCount: number;
}

export interface CmsSettings {
  siteName: string;
  tagline: string;
  announcement?: string;
  maxUploadSizeMb: number;
  allowedCategories: string[];
  contactEmail: string;
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  targetType: 'app' | 'category' | 'cms' | 'auth' | 'storage' | 'verification' | 'system';
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'superadmin';
  createdAt: string;
  lastLoginAt: string;
}

export interface VerificationDiagnostic {
  check: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  signatureVerified: boolean;
  signatureScheme: 'v1' | 'v2' | 'v3' | 'v2+v3' | 'unsigned';
  packageName: string;
  versionName: string;
  versionCode: number;
  apkSha256: string;
  signingCertificateSha256: string;
  permissions: string[];
  minSdk?: number;
  targetSdk?: number;
  diagnostics: VerificationDiagnostic[];
  verifiedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}
