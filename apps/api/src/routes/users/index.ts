import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import { listUsers, getUser, createUser, updateUser, deactivateUser, deleteUser } from '../../services/user.service';

const managers = [UserRole.MANAGER, UserRole.ADMIN];

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export default async function userRoutes(app: FastifyInstance) {
  // GET /users
  app.get('/', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const users = await listUsers(app);
    return reply.status(200).send(successResponse(users));
  });

  // GET /users/:id
  app.get('/:id', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await getUser(app, id);
    return reply.status(200).send(successResponse(user));
  });

  // POST /users
  app.post('/', { preHandler: [authenticate, authorize([UserRole.MANAGER])] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const user = await createUser(app, body);
    return reply.status(201).send(successResponse(user));
  });

  // PUT /users/:id
  app.put('/:id', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const user = await updateUser(app, id, body);
    return reply.status(200).send(successResponse(user));
  });

  // PATCH /users/:id/deactivate
  app.patch('/:id/deactivate', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await deactivateUser(app, id, request.user.sub);
    return reply.status(200).send(successResponse(user));
  });

  // PATCH /users/:id/reactivate
  app.patch('/:id/reactivate', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await updateUser(app, id, { active: true });
    return reply.status(200).send(successResponse(user));
  });

  // DELETE /users/:id
  app.delete('/:id', { preHandler: [authenticate, authorize([UserRole.MANAGER])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await deleteUser(app, id, request.user.sub);
    return reply.status(200).send(successResponse(result));
  });
}
