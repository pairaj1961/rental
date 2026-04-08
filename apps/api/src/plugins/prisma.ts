import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { auditStorage } from './audit';

const EXCLUDED_MODELS = new Set(['AuditLog']);
const AUDIT_OPERATIONS = new Set(['create', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert']);
const ACTION_MAP: Record<string, string> = {
  create: 'CREATED',
  update: 'UPDATED',
  updateMany: 'BULK_UPDATED',
  delete: 'DELETED',
  deleteMany: 'BULK_DELETED',
  upsert: 'UPSERTED',
};

export default fp(async function prismaPlugin(app: FastifyInstance) {
  const basePrisma = new PrismaClient({
    log: app.log.level === 'debug'
      ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
      : [{ emit: 'event', level: 'error' }],
  });

  await basePrisma.$connect();

  // Prisma v5 uses $extends instead of $use for middleware
  const prisma = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // Skip non-auditable operations and excluded models
          if (!model || EXCLUDED_MODELS.has(model) || !AUDIT_OPERATIONS.has(operation)) {
            return query(args);
          }

          const context = auditStorage.getStore();
          if (!context) {
            // No request context (e.g., seed script) — skip audit
            return query(args);
          }

          // Capture before state for mutations
          let beforeValue: any = null;
          if (['update', 'delete'].includes(operation)) {
            try {
              const where = (args as any)?.where;
              if (where) {
                const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
                beforeValue = await (basePrisma as any)[modelKey].findFirst({ where });
              }
            } catch {
              // If we can't get before value, continue anyway
            }
          }

          const result = await query(args);

          // Determine entity ID from result or args
          let entityId = 'unknown';
          if (result && typeof result === 'object' && 'id' in result) {
            entityId = (result as any).id;
          } else if ((args as any)?.where?.id) {
            entityId = (args as any).where.id;
          }

          const afterValue = ['delete', 'deleteMany'].includes(operation) ? null : result;

          // Write audit log — fire-and-forget (don't block response)
          basePrisma.auditLog.create({
            data: {
              entityType: model,
              entityId,
              action: ACTION_MAP[operation] ?? operation.toUpperCase(),
              actorId: context.actorId,
              actorRole: context.actorRole,
              beforeValue: beforeValue ?? undefined,
              afterValue: afterValue ?? undefined,
              ipAddress: context.ip,
            },
          }).catch((err: unknown) => {
            app.log.warn({ err }, 'Failed to write audit log');
          });

          return result;
        },
      },
    },
  });

  app.decorate('prisma', prisma as any);

  app.addHook('onClose', async () => {
    await basePrisma.$disconnect();
  });
}, { name: 'prisma' });
