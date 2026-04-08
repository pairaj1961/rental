import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../../hooks/authenticate';
import { authorize } from '../../../hooks/authorize';
import { listJobSites, createJobSite, updateJobSite, deleteJobSite } from '../../../services/customer.service';

const salesAndUp = [UserRole.ADMIN, UserRole.MANAGER, UserRole.REP];

const createSchema = z.object({
  siteName: z.string().min(1),
  siteAddress: z.string().min(1),
  siteContactPerson: z.string().optional(),
  sitePhone: z.string().optional(),
});

export default async function jobSiteRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const sites = await listJobSites(app, customerId);
    return reply.status(200).send(successResponse(sites));
  });

  app.post('/', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const body = createSchema.parse(request.body);
    const site = await createJobSite(app, customerId, body);
    return reply.status(201).send(successResponse(site));
  });

  app.put('/:siteId', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const { customerId, siteId } = request.params as { customerId: string; siteId: string };
    const body = createSchema.partial().parse(request.body);
    const site = await updateJobSite(app, customerId, siteId, body);
    return reply.status(200).send(successResponse(site));
  });

  app.delete('/:siteId', { preHandler: [authenticate, authorize([UserRole.MANAGER, UserRole.ADMIN])] }, async (request, reply) => {
    const { customerId, siteId } = request.params as { customerId: string; siteId: string };
    await deleteJobSite(app, customerId, siteId);
    return reply.status(200).send(successResponse({ deleted: true }));
  });
}
