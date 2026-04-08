import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@rental/shared';
import { ForbiddenError } from '../lib/errors/http-error';

export function authorize(roles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const role = (request as any).authenticatedUser?.role ?? request.user?.role;
    if (!roles.includes(role as UserRole)) {
      throw new ForbiddenError(`Role '${role}' is not allowed to perform this action`);
    }
  };
}
