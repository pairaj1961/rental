import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { UnauthorizedError, NotFoundError } from '../lib/errors/http-error';

export async function login(app: FastifyInstance, email: string, password: string) {
  const user = await app.prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = app.jwt.sign({
    sub: user.id,
    email: user.email,
    role: user.role as unknown as import('@rental/shared').UserRole,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  const { passwordHash: _, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function getMe(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) throw new NotFoundError('User', userId);
  return user;
}
