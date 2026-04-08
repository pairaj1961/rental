import { FastifyInstance } from 'fastify';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import { getRentalSummary, getEquipmentUsage, getCustomerReport } from '../../services/report.service';

const managers = [UserRole.ADMIN, UserRole.MANAGER];

function parseDateRange(query: any): { from: Date; to: Date } {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ? new Date(query.to) : now;
  return { from, to };
}

export default async function reportRoutes(app: FastifyInstance) {
  app.get('/rental-summary', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { from, to } = parseDateRange(request.query);
    const report = await getRentalSummary(app, from, to);
    return reply.status(200).send(successResponse(report));
  });

  app.get('/equipment-usage', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { from, to } = parseDateRange(request.query);
    const report = await getEquipmentUsage(app, from, to);
    return reply.status(200).send(successResponse(report));
  });

  app.get('/customers', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { from, to } = parseDateRange(request.query);
    const report = await getCustomerReport(app, from, to);
    return reply.status(200).send(successResponse(report));
  });
}
