import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api/router.ts';
import { config } from './src/server/config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Request body parsing - support up to 160MB for direct base64 APK transfers
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

  // Vite integration
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smile Store server running on http://0.0.0.0:${PORT}`);
    console.log(`Database Mode: ${config.firebase.isConfigured ? 'Production Firestore' : 'Local Persistent Database'}`);
    console.log(`Cloudflare R2: ${config.r2.isConfigured ? 'Connected' : 'Local Buffer Cache'}`);
    console.log(`Admin Allowlist: ${config.adminEmailAllowlist.join(', ')}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
