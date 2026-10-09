import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.ts';
import { AppRepository } from '../repositories/firestore.ts';
import { getFirebaseAdmin } from '../firebase/admin.ts';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

export interface SessionPayload {
  uid: string;
  email: string;
  role: 'admin' | 'superadmin';
  csrfToken: string;
  iat: number;
  exp: number;
}

// Rate limiting table for login attempts: ip -> { count, resetAt }
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return { allowed: true };
  }

  if (record.count >= 8) {
    const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export function isEmailAllowed(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return config.adminEmailAllowlist.some((allowed) => allowed.toLowerCase() === normalized);
}

export function createCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function signSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>, expiresInSeconds = 86400): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payloadB64)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return null;
    }

    // Double check email is still on the allowlist
    if (!isEmailAllowed(payload.email)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifies either Firebase ID token or server session token
 */
export async function authenticateAdminRequest(req: Request): Promise<SessionPayload | null> {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.substring(7).trim();

    // Try custom session token first
    const customSession = verifySessionToken(rawToken);
    if (customSession) return customSession;

    // Try Firebase ID token verification if Firebase Admin is configured
    const { auth } = getFirebaseAdmin();
    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(rawToken);
        if (decoded.email && isEmailAllowed(decoded.email)) {
          return {
            uid: decoded.uid,
            email: decoded.email,
            role: 'admin',
            csrfToken: 'firebase-bearer-authenticated',
            iat: decoded.iat,
            exp: decoded.exp,
          };
        }
      } catch {
        // Continue to cookie check
      }
    }
  }

  // 2. Check HttpOnly cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies['smile_admin_session'];
    if (sessionCookie) {
      return verifySessionToken(sessionCookie);
    }
  }

  return null;
}

/**
 * Express middleware requiring authenticated admin privileges.
 * Enforces CSRF token check on mutation requests.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await authenticateAdminRequest(req);

  if (!session) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Administrative privileges required. Please log in with an authorized account.',
    });
    return;
  }

  // CSRF validation on mutating methods for cookie-based requests
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (isMutating && session.csrfToken !== 'firebase-bearer-authenticated') {
    const headerCsrf = req.headers['x-csrf-token'];
    if (!headerCsrf || headerCsrf !== session.csrfToken) {
      res.status(403).json({
        success: false,
        error: 'CSRF_VALIDATION_FAILED',
        message: 'Invalid or missing CSRF token.',
      });
      return;
    }
  }

  // Attach verified session to request object
  (req as Request & { adminSession: SessionPayload }).adminSession = session;
  next();
}
