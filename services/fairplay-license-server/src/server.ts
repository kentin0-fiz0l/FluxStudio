import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { handleLicenseRequest } from './handlers/license-handler';
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const logger = createLogger('server');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'fairplay-license-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// FairPlay License Request Endpoint
// This endpoint receives SPC (Server Playback Context) and returns CKC (Content Key Context)
app.post('/license', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentId = req.query.contentId as string;
    const spcData = req.body;

    if (!contentId) {
      return res.status(400).json({ error: 'Missing contentId parameter' });
    }

    if (!spcData || spcData.length === 0) {
      return res.status(400).json({ error: 'Missing SPC data in request body' });
    }

    logger.info('License request received', {
      contentId,
      userId: (req as any).user?.id,
      spcLength: spcData.length
    });

    // Handle the license request
    const ckc = await handleLicenseRequest({
      contentId,
      spcData,
      userId: (req as any).user?.id,
      userEmail: (req as any).user?.email
    });

    // Return CKC as binary response
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(ckc);

    logger.info('License issued successfully', { contentId, userId: (req as any).user?.id });
  } catch (error) {
    next(error);
  }
});

// Get license information (for debugging/admin)
app.get('/license/:contentId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contentId } = req.params;
    const userId = (req as any).user?.id;

    // TODO: Fetch license info from database
    res.json({
      contentId,
      userId,
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`FairPlay License Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Allowed origins: ${process.env.ALLOWED_ORIGINS}`);
  });
}

export default app;
