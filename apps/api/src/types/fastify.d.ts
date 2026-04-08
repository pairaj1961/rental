import { PrismaClient } from '@prisma/client';
import { JwtPayload, UserRole } from '@rental/shared';

// Extend @fastify/jwt so request.user resolves correctly
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
