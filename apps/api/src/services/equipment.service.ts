import { FastifyInstance } from 'fastify';
import { EquipmentStatus } from '@rental/shared';
import { NotFoundError, ConflictError, ValidationError } from '../lib/errors/http-error';

export interface EquipmentFilters {
  status?: EquipmentStatus;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listEquipment(app: FastifyInstance, filters: EquipmentFilters) {
  const { status, category, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { active: true };
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { modelName: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await app.prisma.$transaction([
    app.prisma.equipment.count({ where }),
    app.prisma.equipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        coverPhoto: {
          select: { id: true, filePath: true, caption: true },
        },
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function getEquipment(app: FastifyInstance, id: string) {
  const equipment = await app.prisma.equipment.findFirst({
    where: { id, active: true },
    include: {
      coverPhoto: true,
      photos: {
        orderBy: { uploadedAt: 'desc' },
        include: { uploader: { select: { id: true, name: true } } },
      },
    },
  });

  if (!equipment) throw new NotFoundError('Equipment', id);
  return equipment;
}

export async function createEquipment(app: FastifyInstance, data: {
  serialNumber: string;
  modelName: string;
  category: string;
  description?: string;
  conditionRating?: number;
  notes?: string;
}) {
  const existing = await app.prisma.equipment.findFirst({
    where: { serialNumber: data.serialNumber },
  });
  if (existing) throw new ConflictError(`Equipment with serial number '${data.serialNumber}' already exists`);

  return app.prisma.equipment.create({ data });
}

export async function updateEquipment(
  app: FastifyInstance,
  id: string,
  data: Partial<{
    modelName: string;
    category: string;
    description: string;
    conditionRating: number;
    notes: string;
    status: EquipmentStatus;
    lastInspectionDate: Date;
  }>,
) {
  await getEquipment(app, id);
  return app.prisma.equipment.update({ where: { id }, data });
}

export async function deleteEquipment(app: FastifyInstance, id: string) {
  const equipment = await app.prisma.equipment.findFirst({ where: { id, active: true } });
  if (!equipment) throw new NotFoundError('Equipment', id);

  if (equipment.status === 'RENTED') {
    throw new ValidationError('Cannot delete equipment that is currently rented');
  }

  return app.prisma.equipment.update({
    where: { id },
    data: { active: false, status: 'RETIRED' },
  });
}

export async function getEquipmentCategories(app: FastifyInstance): Promise<string[]> {
  const result = await app.prisma.equipment.findMany({
    where: { active: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return (result as any[]).map((r: any) => r.category);
}
