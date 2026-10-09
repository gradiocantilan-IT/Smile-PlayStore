import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import JSZip from 'jszip';
import { verifyApkBuffer } from '../../src/server/verification/apkVerifier.ts';
import {
  signSessionToken,
  verifySessionToken,
  isEmailAllowed,
} from '../../src/server/auth/adminAuth.ts';

describe('APK Cryptographic Verification Engine', () => {
  it('rejects arbitrary binary data that is not a valid ZIP archive', async () => {
    const randomBuffer = Buffer.from('This is not an Android APK file');
    const result = await verifyApkBuffer(randomBuffer);

    expect(result.signatureVerified).toBe(false);
    expect(result.signatureScheme).toBe('unsigned');
    const zipDiag = result.diagnostics.find((d) => d.check === 'ZIP Archive Format');
    expect(zipDiag?.passed).toBe(false);
  });

  it('detects unsigned ZIP archives and flags lack of Android signature block', async () => {
    // Generate an unsigned ZIP
    const zip = new JSZip();
    zip.file('AndroidManifest.xml', 'raw manifest content');
    zip.file('classes.dex', 'fake dex bytecode');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const result = await verifyApkBuffer(zipBuffer);

    expect(result.signatureVerified).toBe(false);
    const v2Diag = result.diagnostics.find((d) => d.check === 'APK Signature Scheme (v2/v3 Block)');
    expect(v2Diag?.passed).toBe(false);
    expect(result.apkSha256).toBe(crypto.createHash('sha256').update(zipBuffer).digest('hex'));
  });

  it('computes correct cryptographic SHA-256 digest', async () => {
    const dummyZip = new JSZip();
    dummyZip.file('res/values/strings.xml', '<resources></resources>');
    const buffer = await dummyZip.generateAsync({ type: 'nodebuffer' });

    const expectedSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const result = await verifyApkBuffer(buffer);

    expect(result.apkSha256).toBe(expectedSha256);
  });
});

describe('Admin Authentication & Session Security', () => {
  it('signs and verifies valid admin session tokens', () => {
    const payload = {
      uid: 'user_123',
      email: 'admin@smilestore.app',
      role: 'admin' as const,
      csrfToken: 'test-csrf-token-abc',
    };

    const token = signSessionToken(payload, 3600);
    expect(token).toBeDefined();

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe('admin@smilestore.app');
    expect(verified?.csrfToken).toBe('test-csrf-token-abc');
  });

  it('rejects tampered or forged session tokens', () => {
    const payload = {
      uid: 'user_123',
      email: 'admin@smilestore.app',
      role: 'admin' as const,
      csrfToken: 'test-csrf-token-abc',
    };

    const token = signSessionToken(payload, 3600);
    const [payloadB64, sig] = token.split('.');
    
    // Tamper with payload
    const forgedPayload = Buffer.from(JSON.stringify({ ...payload, email: 'hacker@evil.com' })).toString('base64url');
    const tampered = `${forgedPayload}.${sig}`;

    const verified = verifySessionToken(tampered);
    expect(verified).toBeNull();

    // Also test invalid signature
    const badSig = `${payloadB64}.${sig.substring(0, sig.length - 2)}aa`;
    expect(verifySessionToken(badSig)).toBeNull();
  });

  it('strictly validates emails against the admin allowlist', () => {
    expect(isEmailAllowed('admin@smilestore.app')).toBe(true);
    expect(isEmailAllowed('gradiocantilan@gmail.com')).toBe(true);
    expect(isEmailAllowed('attacker@evil.com')).toBe(false);
    expect(isEmailAllowed('random-user@gmail.com')).toBe(false);
  });
});
