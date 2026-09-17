import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/api/routes';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const portValue = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const PORT = Number.isInteger(portValue) && portValue > 0 ? portValue : 3000;

  app.use(express.json());

  // Mount API routes first
  app.use('/api', apiRouter);

  // Fallback 404 for unhandled API requests
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Resolve production dist path flexibly across execution contexts
  const candidates = [
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, '..', 'dist'),
    __dirname,
  ];
  const distPath = candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) || candidates[0];

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Production build not found. Please run "npm run build" first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AIONOS AIR Resolution Control running on http://0.0.0.0:${PORT}`);
    console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Serving static assets from: ${distPath}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

