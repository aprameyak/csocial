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

// Local storage for development (swap to S3 in production)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, '/tmp/csocial-uploads'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/mov'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

router.post('/upload', authenticate, uploadLimiter, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError(400, 'No file provided');

    const userId = (req as AuthenticatedRequest).user.id;
    const { climbId, routeId, isBeta, caption } = req.body;

    const isVideo = req.file.mimetype.startsWith('video/');

    // In production, upload to S3 and return CDN URL
    // For dev, return a placeholder URL
    const url = env.NODE_ENV === 'production'
      ? `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${req.file.filename}`
      : `http://localhost:${env.PORT}/uploads/${req.file.filename}`;

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
