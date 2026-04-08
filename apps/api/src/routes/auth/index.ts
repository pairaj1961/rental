import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { login, getMe } from '../../services/auth.service';
import { authenticate } from '../../hooks/authenticate';
import { successResponse } from '@rental/shared';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await login(app, body.email, body.password);
    return reply.status(200).send(successResponse(result));
  });

  // POST /auth/logout
  app.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    // Stateless JWT — client discards token
    return reply.status(200).send(successResponse({ message: 'Logged out successfully' }));
  });

  // GET /auth/me
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await getMe(app, request.user.sub);
    return reply.status(200).send(successResponse(user));
  });
}
