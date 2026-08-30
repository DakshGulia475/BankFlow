import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';

/** Development-only fallbacks keep local setup easy; production must supply real values. */
function required(name: string, developmentFallback: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }
  if (nodeEnv === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return developmentFallback;
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/bankflow?replicaSet=rs0'),
  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  /** Comma-separated list of allowed browser origins for the frontend. */
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
};
