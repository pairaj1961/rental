import { FastifyRequest, FastifyReply } from 'fastify';
import { auditStorage } from '../plugins/audit';
import { UnauthorizedError } from '../lib/errors/http-error';

/**
 * Callback-style preHandler (not async) so we can call done() *inside*
 * auditStorage.run(), which makes Fastify's continuation — the next
 * preHandler and the route handler — execute within the ALS context.
 * Using enterWith() in an async hook does NOT reliably propagate through
 * Fastify's internal async scheduling.
 */
export function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: (err?: Error) => void,
): void {
  request
    .jwtVerify()
    .then(async () => {
      const payload = request.user as any;
      const user = await request.server.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true, role: true, email: true, firstName: true, lastName: true },
      });

      if (!user || !user.isActive) {
        done(new UnauthorizedError('Account is disabled or not found'));
        return;
      }

      // Attach to request for authorize() and other hooks
      (request as any).authenticatedUser = user;

      const ip =
        (request.headers['x-forwarded-for'] as string | undefined) ?? request.ip;
      const ctx = { actorId: user.id, actorRole: user.role, ip };

      // Call done() INSIDE run() so all subsequent Fastify handlers
      // (preHandlers + route handler) inherit this ALS context.
      auditStorage.run(ctx, () => done());
    })
    .catch(() => {
      done(new UnauthorizedError('Invalid or expired token'));
    });
}
