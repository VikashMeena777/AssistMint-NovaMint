// ============================================
// AssistMint — Cloudflare R2 Storage Client
// ============================================

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'assistmint-media';
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

// R2 uses S3-compatible API
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ─── Upload File ────────────────────────────

export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

// ─── Upload Menu Image ──────────────────────

export async function uploadMenuImage(
  restaurantId: string,
  file: Buffer | Uint8Array,
  filename: string,
  contentType: string
): Promise<string> {
  const ext = filename.split('.').pop() || 'jpg';
  const key = `restaurants/${restaurantId}/menu/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  return uploadToR2(file, key, contentType);
}

// ─── Upload Restaurant Logo ─────────────────

export async function uploadLogo(
  restaurantId: string,
  file: Buffer | Uint8Array,
  filename: string,
  contentType: string
): Promise<string> {
  const ext = filename.split('.').pop() || 'png';
  const key = `restaurants/${restaurantId}/logo.${ext}`;
  return uploadToR2(file, key, contentType);
}

// ─── Upload Receipt/Invoice ─────────────────

export async function uploadReceipt(
  restaurantId: string,
  orderId: string,
  file: Buffer | Uint8Array,
  contentType: string = 'application/pdf'
): Promise<string> {
  const key = `restaurants/${restaurantId}/receipts/${orderId}.pdf`;
  return uploadToR2(file, key, contentType);
}

// ─── Archive Conversations ──────────────────

export async function archiveConversations(
  restaurantId: string,
  data: string,
  date: string
): Promise<string> {
  const key = `archives/${restaurantId}/conversations/${date}.json`;
  return uploadToR2(Buffer.from(data, 'utf-8'), key, 'application/json');
}

// ─── Delete File ────────────────────────────

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

// ─── Get File ───────────────────────────────

export async function getFromR2(key: string): Promise<Buffer | null> {
  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    const body = await response.Body?.transformToByteArray();
    return body ? Buffer.from(body) : null;
  } catch {
    return null;
  }
}

// ─── Extract Key from URL ───────────────────

export function extractKeyFromUrl(url: string): string {
  if (!R2_PUBLIC_URL) return url;
  return url.replace(`${R2_PUBLIC_URL}/`, '');
}
