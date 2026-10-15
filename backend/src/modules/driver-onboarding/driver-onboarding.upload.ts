import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../utils/apiResponse";

const allowedTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
const allowedKinds = new Set([
  "profilePhoto",
  "vehiclePreviewImage",
  "idDocument",
  "drivingLicense",
  "vehicleRegistration",
  "insuranceCertificate",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdir(env.UPLOAD_DIR, { recursive: true }, (error) =>
      callback(error, env.UPLOAD_DIR),
    );
  },
  filename: (_req, file, callback) => {
    const extension = allowedTypes[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const parser = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const kind = (_req as Request & { body?: { kind?: string } }).body?.kind;
    if (!kind || !allowedKinds.has(kind)) {
      callback(new Error("A valid onboarding document kind must be provided before the file."));
      return;
    }
    if (!allowedTypes[file.mimetype]) {
      callback(new Error("Only JPEG, PNG, WebP, and PDF files are accepted."));
      return;
    }
    callback(null, true);
  },
});

export const uploadOnboardingFile = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  parser.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      ApiResponse.error(
        res,
        error.code === "LIMIT_FILE_SIZE"
          ? "File must be 10 MB or smaller."
          : "Unable to process uploaded file.",
        400,
      );
      return;
    }
    if (error instanceof Error) {
      ApiResponse.error(res, error.message, 400);
      return;
    }
    next();
  });
};

export const verifyOnboardingFileContent = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const file = req.file;
  if (!file) {
    ApiResponse.error(res, "A supported image or document file is required", 400);
    return;
  }

  fs.promises.readFile(file.path)
    .then(async (buffer) => {
      const isJpeg = file.mimetype === "image/jpeg" &&
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = file.mimetype === "image/png" &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isWebp = file.mimetype === "image/webp" &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";
      const isPdf = file.mimetype === "application/pdf" &&
        buffer.toString("ascii", 0, 5) === "%PDF-";
      if (isJpeg || isPng || isWebp || isPdf) {
        next();
        return;
      }

      await fs.promises.unlink(file.path);
      ApiResponse.error(res, "The uploaded file content does not match its file type.", 400);
    })
    .catch(next);
};

export const isSafeOnboardingFilename = (filename: string): boolean =>
  /^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(path.basename(filename));
