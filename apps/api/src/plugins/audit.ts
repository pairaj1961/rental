import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
  actorId: string;
  actorRole: string;
  ip: string | undefined;
}

// Singleton AsyncLocalStorage for threading request context into Prisma $extends
export const auditStorage = new AsyncLocalStorage<AuditContext>();

// No-op plugin — audit logic lives in the prisma plugin via $extends
export default fp(async function auditPlugin(_app: FastifyInstance) {
  // Audit interception is registered in prisma.ts using $extends
}, { name: 'audit' });
