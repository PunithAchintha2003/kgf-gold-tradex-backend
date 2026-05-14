import multer from 'multer';

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file

const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.memoryStorage();

export const productImagesUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES, files: MAX_FILES },
  fileFilter(_req, file, cb) {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
}).array('images', MAX_FILES);

export function handleProductImagesMulterError(err, req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Each image must be 5 MB or smaller' });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: err.message || 'Invalid file upload' });
    }
    return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
  }

  if (err instanceof Error && err.message.includes('Only JPEG')) {
    return res.status(400).json({ success: false, error: err.message });
  }

  return next(err);
}
