import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { badRequest } from '../utils/apiError.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// Files are renamed to a random id so user-supplied names never reach the disk.
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSION_BY_MIME[file.mimetype]}`),
});

export const receiptUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXTENSION_BY_MIME[file.mimetype]) return cb(null, true);
    return cb(badRequest('INVALID_FILE_TYPE', 'Receipts must be a JPG, PNG or WEBP image, or a PDF'));
  },
}).single('receipt');
