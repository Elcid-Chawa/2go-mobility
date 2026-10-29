import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { NextFunction, Request, Response } from "express";
import { env } from "./config/env";

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
const ENCRYPTED_FILE_HEADER = Buffer.from("2GOD");

function documentEncryptionKey(): Buffer {
  const key = Buffer.from(env.RENTAL_DOCUMENT_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("RENTAL_DOCUMENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptRentalDocument(content: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", documentEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  return Buffer.concat([ENCRYPTED_FILE_HEADER, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptDocument(content: Buffer): Buffer {
  const headerSize = ENCRYPTED_FILE_HEADER.length;
  const ivSize = 12;
  const tagSize = 16;
  if (content.length < headerSize + ivSize + tagSize || !content.subarray(0, headerSize).equals(ENCRYPTED_FILE_HEADER)) {
    throw new Error("Stored driving licence document is not a valid encrypted file.");
  }
  const iv = content.subarray(headerSize, headerSize + ivSize);
  const tag = content.subarray(headerSize + ivSize, headerSize + ivSize + tagSize);
  const decipher = crypto.createDecipheriv("aes-256-gcm", documentEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(content.subarray(headerSize + ivSize + tagSize)),
    decipher.final(),
  ]);
}

const parser = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(env.UPLOAD_DIR, { recursive: true, mode: 0o700 }, (error) => callback(error, env.UPLOAD_DIR));
    },
    filename: (_req, file, callback) => {
      const extension = extensions[file.mimetype];
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) {
      callback(new Error("Only JPEG, PNG, WebP, or PDF files are accepted."));
      return;
    }
    callback(null, true);
  },
});

function matchesFileSignature(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return mimeType === "application/pdf" && buffer.toString("ascii", 0, 5) === "%PDF-";
}

export function receiveLicenseDocument(req: Request, res: Response, next: NextFunction): void {
  parser.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Driving licence file must be 10 MB or smaller."
          : "Unable to process the uploaded file.",
      });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: "A driving licence image or PDF is required." });
      return;
    }

    fs.promises.readFile(req.file.path)
      .then(async (buffer) => {
        if (!matchesFileSignature(req.file!.mimetype, buffer)) {
          await fs.promises.unlink(req.file!.path);
          res.status(400).json({ success: false, message: "The uploaded file content does not match its file type." });
          return;
        }
        try {
          await fs.promises.chmod(req.file!.path, 0o600);
          await fs.promises.writeFile(req.file!.path, encryptRentalDocument(buffer), { mode: 0o600 });
        } catch (encryptionError) {
          await fs.promises.unlink(req.file!.path).catch(() => undefined);
          if (encryptionError instanceof Error && encryptionError.message.startsWith("RENTAL_DOCUMENT_ENCRYPTION_KEY")) {
            res.status(503).json({ success: false, message: "Encrypted document storage is not configured." });
            return;
          }
          next(encryptionError);
          return;
        }
        next();
      })
      .catch(async (readError: unknown) => {
        await fs.promises.unlink(req.file!.path).catch(() => undefined);
        next(readError);
      });
  });
}

export function licenseDocumentPath(filename: string): string | null {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(filename)) return null;
  return path.join(env.UPLOAD_DIR, filename);
}

export async function removeLicenseDocument(filename?: string): Promise<void> {
  if (!filename) return;
  const filePath = licenseDocumentPath(filename);
  if (!filePath) throw new Error("Stored driving licence filename is invalid.");
  await fs.promises.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
