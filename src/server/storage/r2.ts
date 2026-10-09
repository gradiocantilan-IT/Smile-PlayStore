import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { config } from '../config.ts';

let s3Instance: S3Client | null = null;

// Local fallback storage buffer cache (for preview/dev environment when R2 credentials have not yet been placed in .env)
const localBufferStore = new Map<string, { buffer: Buffer; contentType: string }>();

export function getR2Client(): S3Client | null {
  if (!config.r2.isConfigured) {
    return null;
  }
  if (!s3Instance) {
    s3Instance = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId!,
        secretAccessKey: config.r2.secretAccessKey!,
      },
    });
  }
  return s3Instance;
}

export function generateObjectKey(prefix: 'quarantine' | 'published' | 'icons' | 'temp', extension: string): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const safeExt = extension.startsWith('.') ? extension : `.${extension}`;
  return `${prefix}/${timestamp}-${randomBytes}${safeExt}`;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900 // 15 mins
): Promise<{ uploadUrl: string; key: string }> {
  const client = getR2Client();
  if (!client) {
    // In dev mode without live R2 credentials, provide direct API upload route
    return {
      uploadUrl: `/api/v1/admin/storage/upload?key=${encodeURIComponent(key)}`,
      key,
    };
  }

  const command = new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { uploadUrl, key };
}

export async function createPresignedDownloadUrl(
  key: string,
  downloadFilename: string,
  expiresInSeconds = 300 // 5 mins
): Promise<string> {
  const client = getR2Client();
  if (!client) {
    // When live R2 is not yet configured, serve through secure streaming proxy endpoint
    return `/api/v1/storage/download?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(downloadFilename)}`;
  }

  const command = new GetObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadFilename.replace(/"/g, '')}"`,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function storeBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const client = getR2Client();
  if (!client) {
    localBufferStore.set(key, { buffer, contentType });
    return;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function retrieveBuffer(key: string): Promise<Buffer | null> {
  const client = getR2Client();
  if (!client) {
    const item = localBufferStore.get(key);
    return item ? item.buffer : null;
  }

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.r2.bucketName,
        Key: key,
      })
    );
    if (!response.Body) return null;
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err) {
    console.error(`Failed to retrieve object ${key} from R2:`, err);
    return null;
  }
}

export async function promoteQuarantineToPublished(quarantineKey: string, newExtension = '.apk'): Promise<string> {
  const publishedKey = generateObjectKey('published', newExtension);
  const client = getR2Client();

  if (!client) {
    const item = localBufferStore.get(quarantineKey);
    if (item) {
      localBufferStore.set(publishedKey, item);
      localBufferStore.delete(quarantineKey);
    }
    return publishedKey;
  }

  // S3 Copy
  await client.send(
    new CopyObjectCommand({
      Bucket: config.r2.bucketName,
      CopySource: `${config.r2.bucketName}/${quarantineKey}`,
      Key: publishedKey,
    })
  );

  // Delete quarantine source
  await deleteObject(quarantineKey);
  return publishedKey;
}

export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  if (!client) {
    localBufferStore.delete(key);
    return;
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.r2.bucketName,
        Key: key,
      })
    );
  } catch (err) {
    console.error(`Failed to delete object ${key} from R2:`, err);
  }
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) {
    return localBufferStore.has(key);
  }

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.r2.bucketName,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function isR2Ready(): boolean {
  return config.r2.isConfigured;
}
