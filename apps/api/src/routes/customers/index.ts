import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../services/customer.service';
import jobSiteRoutes from './job-sites/index';

const salesAndUp = [UserRole.ADMIN, UserRole.MANAGER, UserRole.REP];

const createSchema = z.object({
  customerCode: z.string().min(1).optional(),
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

export default async function customerRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const { search, page, limit } = request.query as any;
    const result = await listCustomers(app, {
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 20,
    });
    return reply.status(200).send(successResponse(result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    }));
  });

  app.post('/', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const customer = await createCustomer(app, body);
    return reply.status(201).send(successResponse(customer));
  });

  app.get('/:id', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await getCustomer(app, id);
    return reply.status(200).send(successResponse(customer));
  });

  app.put('/:id', { preHandler: [authenticate, authorize(salesAndUp)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createSchema.partial().parse(request.body);
    const customer = await updateCustomer(app, id, body);
    return reply.status(200).send(successResponse(customer));
  });

  app.delete('/:id', { preHandler: [authenticate, authorize([UserRole.MANAGER])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteCustomer(app, id);
    return reply.status(200).send(successResponse({ deleted: true }));
  });

  // Register job-site sub-routes
  app.register(jobSiteRoutes, { prefix: '/:customerId/job-sites' });
}
