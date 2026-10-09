import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AppRepository } from '../repositories/firestore.ts';
import { config } from '../config.ts';
import {
  requireAdmin,
  isEmailAllowed,
  createCsrfToken,
  signSessionToken,
  checkLoginRateLimit,
  resetLoginRateLimit,
  SessionPayload,
} from '../auth/adminAuth.ts';
import {
  generateObjectKey,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  storeBuffer,
  retrieveBuffer,
  promoteQuarantineToPublished,
  deleteObject,
  isR2Ready,
} from '../storage/r2.ts';
import { verifyApkBuffer } from '../verification/apkVerifier.ts';
import { AppStatus } from '../../types/index.ts';

export const apiRouter = Router();

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// -----------------------------------------------------------------------------
// 1. PUBLIC HEALTH & DIAGNOSTICS
// -----------------------------------------------------------------------------
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const isFirestore = AppRepository.isFirestoreLive();
  const dbMode = AppRepository.getDatabaseMode();
  const r2Configured = isR2Ready();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smile Store API v1',
    storage: {
      r2Configured,
      mode: r2Configured ? 'cloudflare_r2_cloud' : 'local_buffer_cache',
    },
    database: {
      firestoreConfigured: isFirestore,
      mode: dbMode,
    },
    version: '1.0.0',
  });
});

// -----------------------------------------------------------------------------
// 2. PUBLIC MARKETPLACE ENDPOINTS
// -----------------------------------------------------------------------------

// List published apps (starts strictly empty with 0 apps until real uploads happen)
apiRouter.get('/apps', async (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;

    const apps = await AppRepository.getPublishedApps({ category, search, limit });

    res.json({
      success: true,
      data: apps,
      count: apps.length,
    });
  } catch (err) {
    console.error('Error fetching published apps:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve apps' });
  }
});

// Single app details by slug
apiRouter.get('/apps/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const app = await AppRepository.getAppBySlug(slug);

    if (!app || app.status !== 'published') {
      res.status(404).json({ success: false, error: 'App not found or not published' });
      return;
    }

    res.json({ success: true, data: app });
  } catch (err) {
    console.error('Error fetching app by slug:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve app details' });
  }
});

// Categories list derived strictly from published apps
apiRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await AppRepository.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve categories' });
  }
});

// Secure download flow
// 1. Validate app ID
// 2. Status must be "published"
// 3. signatureVerified must be true
// 4. Generate short-lived signed download URL or stream
// 5. Atomically increment download count
apiRouter.get('/apps/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const app = await AppRepository.getAppById(id);

    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    if (app.status !== 'published') {
      res.status(403).json({
        success: false,
        error: 'DOWNLOAD_FORBIDDEN',
        message: 'This application is not published and cannot be downloaded.',
      });
      return;
    }

    if (!app.signatureVerified) {
      res.status(403).json({
        success: false,
        error: 'SIGNATURE_NOT_VERIFIED',
        message: 'This application does not possess a verified cryptographic signature.',
      });
      return;
    }

    const filename = `${app.slug || 'app'}-v${app.versionName || '1.0.0'}.apk`;
    const downloadUrl = await createPresignedDownloadUrl(app.apkObjectKey, filename, 300);

    // Atomically increment counter
    const newCount = await AppRepository.incrementAppDownloadCount(app.id);

    // Audit log
    await AppRepository.addAuditLog({
      actorEmail: 'public_visitor',
      action: 'APP_DOWNLOAD_INITIATED',
      targetType: 'app',
      targetId: app.id,
      details: {
        slug: app.slug,
        version: app.versionName,
        totalDownloads: newCount,
      },
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresInSeconds: 300,
        filename,
        sha256: app.apkSha256,
        sizeBytes: app.apkSizeBytes,
      },
    });
  } catch (err) {
    console.error('Error in download flow:', err);
    res.status(500).json({ success: false, error: 'Failed to generate download URL' });
  }
});

// Secure streaming fallback endpoint for download URL when in local cache mode
apiRouter.get('/storage/download', async (req: Request, res: Response) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const filename = typeof req.query.filename === 'string' ? req.query.filename : 'application.apk';

  if (!key) {
    res.status(400).json({ error: 'Missing object key' });
    return;
  }

  const buffer = await retrieveBuffer(key);
  if (!buffer) {
    res.status(404).json({ error: 'File object not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

// Contact / Report an App
const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(3).max(150),
  message: z.string().min(10).max(2000),
  appId: z.string().optional(),
});

apiRouter.post('/contact', async (req: Request, res: Response) => {
  try {
    const validated = ContactSchema.parse(req.body);
    await AppRepository.addAuditLog({
      actorEmail: validated.email,
      action: 'USER_REPORT_OR_INQUIRY',
      targetType: validated.appId ? 'app' : 'system',
      targetId: validated.appId,
      details: {
        name: validated.name,
        subject: validated.subject,
        message: validated.message,
      },
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'Your report or inquiry has been received. Thank you.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid input' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// -----------------------------------------------------------------------------
// 3. ADMIN AUTHENTICATION
// -----------------------------------------------------------------------------
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

apiRouter.post('/admin/auth/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rateLimit = checkLoginRateLimit(ip);

  if (!rateLimit.allowed) {
    res.status(429).json({
      success: false,
      error: 'TOO_MANY_ATTEMPTS',
      message: `Too many login attempts. Please wait ${rateLimit.waitSeconds} seconds.`,
    });
    return;
  }

  try {
    const { email } = LoginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    if (!isEmailAllowed(normalizedEmail)) {
      await AppRepository.addAuditLog({
        actorEmail: normalizedEmail,
        action: 'ADMIN_LOGIN_REJECTED_UNAUTHORIZED',
        targetType: 'auth',
        details: { reason: 'Email not present in ADMIN_EMAIL_ALLOWLIST' },
        ipAddress: ip,
      });

      res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'This email is not authorized to access the Smile Store administrative console.',
      });
      return;
    }

    resetLoginRateLimit(ip);

    // Bootstrap or update user record
    const adminUser = await AppRepository.upsertUser({ email: normalizedEmail, role: 'admin' });

    // Generate CSRF token & session token
    const csrfToken = createCsrfToken();
    const sessionToken = signSessionToken({
      uid: adminUser.uid,
      email: adminUser.email,
      role: adminUser.role,
      csrfToken,
    });

    // Set secure cookie
    res.setHeader(
      'Set-Cookie',
      `smile_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    );

    await AppRepository.addAuditLog({
      actorEmail: adminUser.email,
      action: 'ADMIN_LOGIN_SUCCESSFUL',
      targetType: 'auth',
      targetId: adminUser.uid,
      details: { role: adminUser.role },
      ipAddress: ip,
    });

    res.json({
      success: true,
      data: {
        user: adminUser,
        csrfToken,
        token: sessionToken,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid login details' });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login authentication failure' });
  }
});

apiRouter.get('/admin/auth/me', async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession?: SessionPayload }).adminSession;
  if (!session) {
    // Check if session can be authenticated
    const authSession = await requireAdmin(req, res, () => {
      // passed
    });
    // If response was sent by requireAdmin, return
    if (res.headersSent) return;
  }

  const activeSession = (req as Request & { adminSession?: SessionPayload }).adminSession;
  if (!activeSession) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const user = await AppRepository.getUserByEmail(activeSession.email);
  res.json({
    success: true,
    data: {
      user: user || {
        uid: activeSession.uid,
        email: activeSession.email,
        role: activeSession.role,
      },
      csrfToken: activeSession.csrfToken,
    },
  });
});

apiRouter.post('/admin/auth/logout', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;

  await AppRepository.addAuditLog({
    actorEmail: session.email,
    action: 'ADMIN_LOGOUT',
    targetType: 'auth',
    targetId: session.uid,
    ipAddress: getClientIp(req),
  });

  res.setHeader(
    'Set-Cookie',
    `smile_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );

  res.json({ success: true, message: 'Logged out successfully' });
});

// -----------------------------------------------------------------------------
// 4. ADMIN APP MANAGEMENT & UPLOADS
// -----------------------------------------------------------------------------

// List apps for admin with status filter
apiRouter.get('/admin/apps', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? (req.query.status as AppStatus) : undefined;
    const apps = await AppRepository.getAllAppsForAdmin(status);
    res.json({ success: true, data: apps, count: apps.length });
  } catch (err) {
    console.error('Error fetching admin apps:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch apps' });
  }
});

// Direct APK buffer upload and verification
const UploadAppSchema = z.object({
  title: z.string().min(2).max(100),
  developerName: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  category: z.string().min(2),
  apkBase64: z.string().min(100), // base64 encoded APK binary
  iconBase64: z.string().optional(),
  slug: z.string().optional(),
});

apiRouter.post('/admin/apps/upload', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;

  try {
    const data = UploadAppSchema.parse(req.body);

    const apkBuffer = Buffer.from(data.apkBase64, 'base64');
    const apkSizeBytes = apkBuffer.length;
    const maxBytes = config.maxApkSizeMb * 1024 * 1024;

    if (apkSizeBytes > maxBytes) {
      res.status(400).json({
        success: false,
        error: `APK size exceeds configured maximum limit of ${config.maxApkSizeMb} MB.`,
      });
      return;
    }

    // 1. Generate quarantine object key
    const quarantineKey = generateObjectKey('quarantine', '.apk');

    // 2. Upload to quarantine storage
    await storeBuffer(quarantineKey, apkBuffer, 'application/vnd.android.package-archive');

    // 3. Store icon if provided
    let iconKey = '';
    let iconUrl = '';
    if (data.iconBase64) {
      iconKey = generateObjectKey('icons', '.png');
      const iconBuffer = Buffer.from(data.iconBase64, 'base64');
      await storeBuffer(iconKey, iconBuffer, 'image/png');
      iconUrl = `/api/v1/storage/download?key=${encodeURIComponent(iconKey)}&filename=icon.png`;
    }

    // 4. Run cryptographic APK verification pipeline
    const verification = await verifyApkBuffer(apkBuffer);

    // 5. Generate unique slug
    const baseSlug = (data.slug || data.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // 6. Create database record in 'pending' or 'draft' status
    const app = await AppRepository.createApp({
      slug: uniqueSlug,
      title: data.title,
      developerName: data.developerName,
      description: data.description,
      category: data.category,
      packageName: verification.packageName,
      versionName: verification.versionName,
      versionCode: verification.versionCode,
      iconObjectKey: iconKey,
      iconUrl,
      apkObjectKey: quarantineKey,
      apkSha256: verification.apkSha256,
      apkSizeBytes,
      signingCertificateSha256: verification.signingCertificateSha256,
      signatureVerified: verification.signatureVerified,
      signatureScheme: verification.signatureScheme,
      permissions: verification.permissions,
      minSdk: verification.minSdk,
      targetSdk: verification.targetSdk,
      status: 'pending',
      createdBy: session.email,
    });

    // 7. Audit log
    await AppRepository.addAuditLog({
      actorEmail: session.email,
      action: 'APP_UPLOADED_TO_QUARANTINE',
      targetType: 'app',
      targetId: app.id,
      details: {
        title: app.title,
        packageName: app.packageName,
        version: app.versionName,
        signatureVerified: verification.signatureVerified,
        signatureScheme: verification.signatureScheme,
        apkSha256: verification.apkSha256,
        certFingerprint: verification.signingCertificateSha256,
      },
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      data: {
        app,
        verification,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid upload parameters' });
      return;
    }
    console.error('APK upload error:', err);
    res.status(500).json({ success: false, error: 'Internal failure during APK processing' });
  }
});

// Explicit APK verification trigger on demand
apiRouter.post('/admin/apps/:id/verify', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;
  const { id } = req.params;

  try {
    const app = await AppRepository.getAppById(id);
    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    const apkBuffer = await retrieveBuffer(app.apkObjectKey);
    if (!apkBuffer) {
      res.status(404).json({ success: false, error: 'APK binary object not found in storage' });
      return;
    }

    const verification = await verifyApkBuffer(apkBuffer, app.packageName);

    // Update app record with verified metadata
    const updated = await AppRepository.updateApp(id, {
      packageName: verification.packageName,
      versionName: verification.versionName,
      versionCode: verification.versionCode,
      apkSha256: verification.apkSha256,
      signingCertificateSha256: verification.signingCertificateSha256,
      signatureVerified: verification.signatureVerified,
      signatureScheme: verification.signatureScheme,
      permissions: verification.permissions,
      minSdk: verification.minSdk,
      targetSdk: verification.targetSdk,
    });

    await AppRepository.addAuditLog({
      actorEmail: session.email,
      action: 'APK_SIGNATURE_VERIFIED_EXPLICITLY',
      targetType: 'app',
      targetId: id,
      details: {
        passed: verification.signatureVerified,
        scheme: verification.signatureScheme,
        certFingerprint: verification.signingCertificateSha256,
      },
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      data: {
        app: updated,
        verification,
      },
    });
  } catch (err) {
    console.error('Error verifying app:', err);
    res.status(500).json({ success: false, error: 'Failed to verify APK signature' });
  }
});

// Status change / Publication approval
// SECURITY RULE: An app CANNOT be published if signatureVerified is false!
const StatusChangeSchema = z.object({
  status: z.enum(['draft', 'pending', 'published', 'rejected', 'archived']),
  rejectionReason: z.string().optional(),
});

apiRouter.patch('/admin/apps/:id/status', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;
  const { id } = req.params;

  try {
    const { status, rejectionReason } = StatusChangeSchema.parse(req.body);
    const app = await AppRepository.getAppById(id);

    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    // MANDATORY REQUIREMENT: Block publication if signature verification failed
    if (status === 'published') {
      if (!app.signatureVerified) {
        res.status(400).json({
          success: false,
          error: 'PUBLICATION_REJECTED_UNVERIFIED',
          message:
            'Cannot publish this application: Cryptographic signature verification failed or is incomplete. An APK must be signed and verified before it can be published.',
        });
        return;
      }

      // Promote quarantine APK to published storage namespace if still in quarantine
      if (app.apkObjectKey.startsWith('quarantine/')) {
        const publishedKey = await promoteQuarantineToPublished(app.apkObjectKey);
        await AppRepository.updateApp(id, { apkObjectKey: publishedKey });
      }
    }

    const updates: Partial<typeof app> = {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      approvedBy: status === 'published' ? session.email : app.approvedBy,
      publishedAt: status === 'published' ? new Date().toISOString() : app.publishedAt,
    };

    const updatedApp = await AppRepository.updateApp(id, updates);

    await AppRepository.addAuditLog({
      actorEmail: session.email,
      action: `APP_STATUS_CHANGED_${status.toUpperCase()}`,
      targetType: 'app',
      targetId: id,
      details: {
        previousStatus: app.status,
        newStatus: status,
        rejectionReason,
      },
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: updatedApp });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid status change' });
      return;
    }
    console.error('Error changing app status:', err);
    res.status(500).json({ success: false, error: 'Failed to update app status' });
  }
});

// Update app metadata
const UpdateMetadataSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  developerName: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.string().min(2).optional(),
});

apiRouter.patch('/admin/apps/:id', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;
  const { id } = req.params;

  try {
    const updates = UpdateMetadataSchema.parse(req.body);
    const existing = await AppRepository.getAppById(id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    const updated = await AppRepository.updateApp(id, updates);

    await AppRepository.addAuditLog({
      actorEmail: session.email,
      action: 'APP_METADATA_UPDATED',
      targetType: 'app',
      targetId: id,
      details: updates,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid input' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to update metadata' });
  }
});

// Delete app (with R2 cleanup)
apiRouter.delete('/admin/apps/:id', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;
  const { id } = req.params;

  try {
    const app = await AppRepository.getAppById(id);
    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    // Clean up stored APK and icon objects in R2
    if (app.apkObjectKey) {
      await deleteObject(app.apkObjectKey);
    }
    if (app.iconObjectKey) {
      await deleteObject(app.iconObjectKey);
    }

    await AppRepository.deleteApp(id);

    await AppRepository.addAuditLog({
      actorEmail: session.email,
      action: 'APP_DELETED_PERMANENTLY',
      targetType: 'app',
      targetId: id,
      details: {
        title: app.title,
        packageName: app.packageName,
        apkObjectKey: app.apkObjectKey,
      },
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: `Application "${app.title}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting app:', err);
    res.status(500).json({ success: false, error: 'Failed to delete application' });
  }
});

// -----------------------------------------------------------------------------
// 5. CMS SETTINGS & AUDIT LOGS
// -----------------------------------------------------------------------------
apiRouter.get('/admin/cms', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await AppRepository.getCmsSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch CMS settings' });
  }
});

const CmsUpdateSchema = z.object({
  siteName: z.string().min(2).optional(),
  tagline: z.string().min(2).optional(),
  announcement: z.string().optional(),
  maxUploadSizeMb: z.number().min(10).max(500).optional(),
  allowedCategories: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
  maintenanceMode: z.boolean().optional(),
});

apiRouter.put('/admin/cms', requireAdmin, async (req: Request, res: Response) => {
  const session = (req as Request & { adminSession: SessionPayload }).adminSession;

  try {
    const updates = CmsUpdateSchema.parse(req.body);
    const updated = await AppRepository.updateCmsSettings(updates, session.email);

    await AppRepository.addAuditLog({
      actorEmail: session.email,
      action: 'CMS_SETTINGS_UPDATED',
      targetType: 'cms',
      details: updates,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid input' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to update CMS settings' });
  }
});

apiRouter.get('/admin/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 100;
    const logs = await AppRepository.getAuditLogs(limit);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// Admin bootstrap endpoint for initial setup
apiRouter.post('/admin/bootstrap', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, error: 'Email required' });
    return;
  }

  const normalized = email.toLowerCase().trim();
  if (!isEmailAllowed(normalized)) {
    res.status(403).json({
      success: false,
      error: 'BOOTSTRAP_REJECTED',
      message: 'Email address is not in ADMIN_EMAIL_ALLOWLIST.',
    });
    return;
  }

  const user = await AppRepository.upsertUser({ email: normalized, role: 'superadmin' });
  const csrfToken = createCsrfToken();
  const token = signSessionToken({
    uid: user.uid,
    email: user.email,
    role: user.role,
    csrfToken,
  });

  res.setHeader(
    'Set-Cookie',
    `smile_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );

  await AppRepository.addAuditLog({
    actorEmail: normalized,
    action: 'ADMIN_BOOTSTRAP_INITIALIZED',
    targetType: 'auth',
    targetId: user.uid,
    ipAddress: getClientIp(req),
  });

  res.json({
    success: true,
    message: `Administrator "${normalized}" initialized successfully.`,
    data: { user, csrfToken, token },
  });
});
