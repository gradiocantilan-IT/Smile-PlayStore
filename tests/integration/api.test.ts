import { describe, it, expect } from 'vitest';
import { AppRepository } from '../../src/server/repositories/firestore.ts';

describe('Repository & Marketplace State Integrity', () => {
  it('marketplace starts with zero published apps on fresh deployment', async () => {
    const publishedApps = await AppRepository.getPublishedApps();
    expect(publishedApps).toEqual([]);
    expect(publishedApps.length).toBe(0);
  });

  it('categories derived from published apps are initially empty', async () => {
    const categories = await AppRepository.getCategories();
    expect(categories).toEqual([]);
    expect(categories.length).toBe(0);
  });

  it('retrieves default CMS settings without dummy or hardcoded apps', async () => {
    const cms = await AppRepository.getCmsSettings();
    expect(cms.siteName).toBe('Smile Store');
    expect(cms.tagline).toBe('Android App Marketplace');
    expect(cms.maxUploadSizeMb).toBeGreaterThanOrEqual(50);
  });

  it('records audit log entries reliably', async () => {
    const entry = await AppRepository.addAuditLog({
      actorEmail: 'test-admin@smilestore.app',
      action: 'TEST_AUDIT_EVENT',
      targetType: 'system',
      details: { verified: true },
    });

    expect(entry.id).toBeDefined();
    expect(entry.actorEmail).toBe('test-admin@smilestore.app');

    const logs = await AppRepository.getAuditLogs(10);
    expect(logs.some((l) => l.action === 'TEST_AUDIT_EVENT')).toBe(true);
  });
});
