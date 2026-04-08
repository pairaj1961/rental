import Fastify from 'fastify';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyHelmet from '@fastify/helmet';

import { config } from './config';
import prismaPlugin from './plugins/prisma';
import jwtPlugin from './plugins/jwt';
import multipartPlugin from './plugins/multipart';
import staticPlugin from './plugins/static';
import auditPlugin from './plugins/audit';
import { registerErrorHandler } from './lib/errors/error-handler';
import registerRoutes from './routes/index';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'debug' : 'info',
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ── Security & CORS ───────────────────────────────────────────────────────
  await app.register(fastifySensible);
  await app.register(fastifyCors, {
    origin: config.NODE_ENV === 'development'
      ? (origin, cb) => { cb(null, true); }  // allow all origins in dev
      : config.CORS_ORIGIN.includes(',') ? config.CORS_ORIGIN.split(',').map((s) => s.trim()) : config.CORS_ORIGIN,
    credentials: true,
  });
  await app.register(fastifyRateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    errorResponseBuilder: () => ({
      success: false,
      data: null,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      meta: null,
    }),
  });
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // ── Core Plugins ─────────────────────────────────────────────────────────
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(multipartPlugin);
  await app.register(staticPlugin);
  await app.register(auditPlugin);

  // ── Error Handler ─────────────────────────────────────────────────────────
  registerErrorHandler(app);

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(registerRoutes);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
