import { Router } from 'express';
import mongoose from 'mongoose';

const STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: STATES[dbState] ?? 'unknown',
    uptime: process.uptime(),
  });
});
