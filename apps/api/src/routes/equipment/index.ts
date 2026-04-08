import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, EquipmentStatus, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import {
  listEquipment,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentCategories,
} from '../../services/equipment.service';
import { listEquipmentMaintenanceLogs } from '../../services/maintenance.service';
import photoRoutes from './photos/index';

const allRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.PRODUCT_MANAGER];
const managers = [UserRole.ADMIN, UserRole.MANAGER];

const createSchema = z.object({
  serialNumber: z.string().min(1),
  modelName: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  conditionRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.nativeEnum(EquipmentStatus).optional(),
  lastInspectionDate: z.coerce.date().optional(),
});

export default async function equipmentRoutes(app: FastifyInstance) {
  // GET /equipment?status=&category=&search=&page=&limit=
  app.get('/', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { status, category, search, page, limit } = request.query as any;
    const result = await listEquipment(app, {
      status,
      category,
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

  // GET /equipment/categories
  app.get('/categories', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const categories = await getEquipmentCategories(app);
    return reply.status(200).send(successResponse(categories));
  });

  // POST /equipment
  app.post('/', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const equipment = await createEquipment(app, body);
    return reply.status(201).send(successResponse(equipment));
  });

  // GET /equipment/:id
  app.get('/:id', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const equipment = await getEquipment(app, id);
    return reply.status(200).send(successResponse(equipment));
  });

  // PUT /equipment/:id
  app.put('/:id', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const equipment = await updateEquipment(app, id, body);
    return reply.status(200).send(successResponse(equipment));
  });

  // DELETE /equipment/:id
  app.delete('/:id', { preHandler: [authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteEquipment(app, id);
    return reply.status(200).send(successResponse({ deleted: true }));
  });

  // GET /equipment/:id/maintenance
  app.get('/:id/maintenance', { preHandler: [authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.PRODUCT_MANAGER])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const logs = await listEquipmentMaintenanceLogs(app, id);
    return reply.status(200).send(successResponse(logs));
  });

  // Register photo sub-routes
  app.register(photoRoutes, { prefix: '/:id/photos' });
}
