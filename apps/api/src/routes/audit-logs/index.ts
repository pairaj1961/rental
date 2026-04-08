import { FastifyInstance } from 'fastify';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';

export default async function auditLogRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [authenticate, authorize([UserRole.MANAGER, UserRole.ADMIN])],
  }, async (request, reply) => {
    const {
      entityType,
      entityId,
      actorId,
      action,
      search,
      from,
      to,
      page = '1',
      limit = '20',
    } = request.query as any;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { actorId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await app.prisma.$transaction([
      app.prisma.auditLog.count({ where }),
      app.prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    // Enrich logs with actor names (no FK — join manually)
    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))];
    const actors = actorIds.length
      ? await app.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.name]));
    const enrichedLogs = logs.map((l) => ({ ...l, actorName: actorMap[l.actorId] ?? null }));

    return reply.status(200).send(successResponse({
      items: enrichedLogs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    }));
  });
}
