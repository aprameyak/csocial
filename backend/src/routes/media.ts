import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import type { AuthenticatedRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/csocial-uploads';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

// Local storage for development — swap storage to S3 in production
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype];
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) cb(null, true);
    else cb(new Error('Invalid file type. Allowed: jpeg, png, webp, mp4, mov'));
  },
});

router.post('/upload', authenticate, uploadLimiter, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError(400, 'No file provided');

    const userId = (req as AuthenticatedRequest).user.id;
    const { climbId, routeId, isBeta, caption } = req.body;

    const isVideo = req.file.mimetype.startsWith('video/');

    // In production, upload to S3 and return CDN URL
    // For dev, serve from local static endpoint
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${env.PORT}`;
    const url = env.NODE_ENV === 'production'
      ? `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${req.file.filename}`
      : `${baseUrl}/uploads/${req.file.filename}`;

    const media = await prisma.media.create({
      data: {
        userId,
        climbId: climbId || null,
        routeId: routeId || null,
        type: isVideo ? 'VIDEO' : 'PHOTO',
        url,
        size: req.file.size,
        isBeta: isBeta === 'true',
        caption: caption || null,
      },
    });

    res.status(201).json({ success: true, data: media });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const media = await prisma.media.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!media) throw new AppError(404, 'Media not found');
    if (media.userId !== userId) throw new AppError(403, 'Forbidden');

    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
