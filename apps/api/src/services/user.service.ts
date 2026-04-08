import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { UserRole } from '@rental/shared';
import { NotFoundError, ConflictError } from '../lib/errors/http-error';

export async function listUsers(app: FastifyInstance) {
  return app.prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUser(app: FastifyInstance, id: string) {
  const user = await app.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  if (!user) throw new NotFoundError('User', id);
  return user;
}

export async function createUser(
  app: FastifyInstance,
  data: { name: string; email: string; password: string; role: UserRole },
) {
  const existing = await app.prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) throw new ConflictError('Email is already in use');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await app.prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return user;
}

export async function updateUser(
  app: FastifyInstance,
  id: string,
  data: { name?: string; email?: string; role?: UserRole; active?: boolean; password?: string },
) {
  await getUser(app, id);

  if (data.email) {
    const existing = await app.prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
    if (existing && existing.id !== id) throw new ConflictError('Email is already in use');
  }

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.role !== undefined) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  return app.prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
}

export async function deactivateUser(app: FastifyInstance, id: string, requesterId: string) {
  if (id === requesterId) throw new ConflictError('You cannot deactivate your own account');
  await getUser(app, id);
  return app.prisma.user.update({
    where: { id },
    data: { active: false },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
}

export async function deleteUser(app: FastifyInstance, id: string, requesterId: string) {
  if (id === requesterId) throw new ConflictError('You cannot delete your own account');
  await getUser(app, id);

  // Check if user has any rental order relations that would block deletion
  const hasRentalRelations = await app.prisma.rentalOrder.findFirst({
    where: {
      OR: [
        { createdBy: id } as any,
        { assignedSales: id } as any,
        { assignedService: { some: { id } } } as any,
      ],
    },
  });
  if (hasRentalRelations) throw new ConflictError('Cannot delete user with existing rental records. Deactivate instead.');

  // Check inspection reports, maintenance logs, documents, and equipment photos
  const [hasInspections, hasMaintenance, hasDocuments, hasPhotos] = await Promise.all([
    app.prisma.inspectionReport.findFirst({ where: { inspectedBy: id } as any }),
    app.prisma.maintenanceLog.findFirst({ where: { performedBy: id } as any }),
    app.prisma.document.findFirst({ where: { generatedBy: id } as any }),
    app.prisma.equipmentPhoto.findFirst({ where: { uploadedBy: id } as any }),
  ]);
  if (hasInspections || hasMaintenance || hasDocuments || hasPhotos) {
    throw new ConflictError('Cannot delete user with existing inspection, maintenance, document, or photo records. Deactivate instead.');
  }

  await app.prisma.user.delete({ where: { id } });
  return { deleted: true };
}
