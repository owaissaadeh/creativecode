import { Storage } from "@google-cloud/storage";
import type { Response } from "express";
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

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
} as any);

/**
 * Writes under a `private/` prefix and returns only the opaque object key —
 * never a directly-fetchable URL. Callers must store the key in a DB row and
 * serve it back only through an authenticated, ownership-checked download route
 * (see streamPrivateFile below); the key's randomness is hygiene, not the security boundary.
 */
export async function uploadPrivateFile(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `private/${randomUUID()}-${safeName}`;
  const file = gcsClient.bucket(bucketId).file(objectKey);
  await file.save(buffer, { contentType: mimetype, resumable: false, validation: false });
  return objectKey;
}

export async function streamPrivateFile(objectKey: string, res: Response, filename: string, mimetype: string) {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
  const file = gcsClient.bucket(bucketId).file(objectKey);
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ message: "الملف غير موجود" });
    return;
  }
  const [buffer] = await file.download();
  res.set("Content-Type", mimetype || "application/octet-stream");
  res.set("Content-Length", String(buffer.length));
  res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.set("Cache-Control", "private, no-store");
  res.end(buffer);
}
