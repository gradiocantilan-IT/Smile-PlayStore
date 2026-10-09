import express, { Request, Response, NextFunction } from 'express';
import { apiRouter } from '../src/server/api/router.ts';

const app = express();

app.use(express.json({ limit: '160mb' }));
app.use(express.urlencoded({ extended: true, limit: '160mb' }));

// Security Headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API router
app.use('/api/v1', apiRouter);

// Vercel serverless export handler
export default app;
