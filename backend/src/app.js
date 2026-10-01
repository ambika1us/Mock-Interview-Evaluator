import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import interviewRoutes from './routes/interviews.js';
import adminRoutes from './routes/admin.js';
import { notFound, errorHandler } from './middleware/error.js';
import { llmEnabled } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'mock-interview-api',
      llmEvaluator: llmEnabled() ? 'enabled' : 'offline-fallback',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
