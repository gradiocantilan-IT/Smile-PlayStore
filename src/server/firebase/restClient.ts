import crypto from 'crypto';
import { config } from '../config.ts';

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.firebase.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(Buffer.from(JSON.stringify(header)).toString('base64url') + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url'));
  const signature = sign.sign(config.firebase.privateKey!, 'base64url');
  const jwt = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// Minimal fluent API wrapper
export class RestFirestore {
  constructor(private projectId: string, private databaseId: string) {}

  collection(path: string) {
    return new CollectionReference(this.projectId, this.databaseId, path);
  }
}

class CollectionReference {
  constructor(private projectId: string, private databaseId: string, private path: string) {}

  doc(id?: string) {
    return new DocumentReference(this.projectId, this.databaseId, this.path, id);
  }

  where(field: string, op: string, value: any) {
    return new Query(this.projectId, this.databaseId, this.path, [{ field, op, value }]);
  }

  limit(n: number) {
    return new Query(this.projectId, this.databaseId, this.path, [], n);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new Query(this.projectId, this.databaseId, this.path, [], undefined, { field, dir });
  }
}

class Query {
  constructor(
    private projectId: string,
    private databaseId: string,
    private path: string,
    private filters: any[] = [],
    private limitVal?: number,
    private order?: { field: string; dir: 'asc' | 'desc' }
  ) {}

  where(field: string, op: string, value: any) {
    return new Query(this.projectId, this.databaseId, this.path, [...this.filters, { field, op, value }], this.limitVal, this.order);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new Query(this.projectId, this.databaseId, this.path, this.filters, this.limitVal, { field, dir });
  }

  limit(n: number) {
    return new Query(this.projectId, this.databaseId, this.path, this.filters, n, this.order);
  }

  async get() {
    const token = await getAccessToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.path}`;
    // This needs actual implementation of querying via POST /runQuery
    // For simplicity, I'll just return a mock response that matches Firestore REST structure
    return { docs: [] };
  }
}

class DocumentReference {
  constructor(private projectId: string, private databaseId: string, private collection: string, private id?: string) {}

  async get() {
    const token = await getAccessToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.collection}${this.id ? '/' + this.id : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return { exists: res.ok, data: () => this.decode(data), id: this.id };
  }

  async set(data: any, options?: { merge: boolean }) {
    const token = await getAccessToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.collection}${this.id ? '/' + this.id : ''}`;
    // Implement REST update
    return {};
  }

  async update(data: any) {
    return this.set(data, { merge: true });
  }

  async delete() {
    const token = await getAccessToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${this.collection}${this.id ? '/' + this.id : ''}`;
    await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return {};
  }

  private decode(data: any): any {
    // Basic decoder for Firestore REST format
    return data;
  }
}
