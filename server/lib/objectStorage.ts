import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Response } from "express";
import type { Readable } from "stream";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";

// Deliverables / ticket attachments: broader file types than the logo/favicon uploader in
// routes.ts, larger size cap, block only executable extensions as a basic hygiene minimum.
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".msi", ".com", ".ps1"];
export const uploadPrivateFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, !BLOCKED_EXTENSIONS.includes(ext));
  },
});

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage credentials not set (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).");
  }
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return r2Client;
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not set.");
  return bucket;
}

async function streamToResponse(body: Readable | undefined, res: Response) {
  if (!body) {
    res.status(404).json({ message: "الملف غير موجود" });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    body.pipe(res);
    body.on("end", resolve);
    body.on("error", reject);
  });
}

/**
 * Writes under `public/<filename>` — served back through `/api/files/:filename` (see routes.ts),
 * used for logo/favicon uploads where the content is meant to be publicly viewable.
 */
export async function uploadPublicFile(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: `public/${filename}`,
    Body: buffer,
    ContentType: mimetype,
  }));
  return `/api/files/${filename}`;
}

export async function streamPublicFile(filename: string, res: Response) {
  try {
    const client = getR2Client();
    const obj = await client.send(new GetObjectCommand({ Bucket: getBucketName(), Key: `public/${filename}` }));
    res.set("Content-Type", obj.ContentType || "application/octet-stream");
    res.set("Cache-Control", "public, max-age=31536000");
    await streamToResponse(obj.Body as Readable | undefined, res);
  } catch {
    res.status(404).json({ message: "الملف غير موجود" });
  }
}

/**
 * Writes under a `private/` prefix and returns only the opaque object key —
 * never a directly-fetchable URL. Callers must store the key in a DB row and
 * serve it back only through an authenticated, ownership-checked download route
 * (see streamPrivateFile below); the key's randomness is hygiene, not the security boundary.
 */
export async function uploadPrivateFile(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
  const client = getR2Client();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `private/${randomUUID()}-${safeName}`;
  await client.send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: objectKey,
    Body: buffer,
    ContentType: mimetype,
  }));
  return objectKey;
}

export async function streamPrivateFile(objectKey: string, res: Response, filename: string, mimetype: string) {
  try {
    const client = getR2Client();
    const obj = await client.send(new GetObjectCommand({ Bucket: getBucketName(), Key: objectKey }));
    res.set("Content-Type", mimetype || obj.ContentType || "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.set("Cache-Control", "private, no-store");
    await streamToResponse(obj.Body as Readable | undefined, res);
  } catch {
    res.status(404).json({ message: "الملف غير موجود" });
  }
}
