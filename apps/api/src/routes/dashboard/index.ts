import { FastifyInstance } from 'fastify';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import { getDashboard } from '../../services/dashboard.service';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.PRODUCT_MANAGER])],
  }, async (request, reply) => {
    const data = await getDashboard(app, request.user.sub, request.user.role as UserRole);
    return reply.status(200).send(successResponse(data));
  });
}
