import { FastifyInstance } from 'fastify';
import { MaintenanceType } from '@rental/shared';
import { NotFoundError } from '../lib/errors/http-error';

export async function listMaintenanceLogs(app: FastifyInstance, rentalId: string) {
  const rental = await app.prisma.rentalOrder.findUnique({ where: { id: rentalId } });
  if (!rental) throw new NotFoundError('Rental', rentalId);

  return app.prisma.maintenanceLog.findMany({
    where: { rentalId },
    orderBy: { visitDate: 'desc' },
    include: {
      technician: { select: { id: true, name: true } },
      equipment: { select: { id: true, modelName: true, serialNumber: true } },
    },
  });
}

export async function listEquipmentMaintenanceLogs(app: FastifyInstance, equipmentId: string) {
  return app.prisma.maintenanceLog.findMany({
    where: { equipmentId },
    orderBy: { visitDate: 'desc' },
    include: {
      technician: { select: { id: true, name: true } },
      rental: { select: { id: true, rentalNumber: true, status: true } },
    },
  });
}

export async function getMaintenanceLog(app: FastifyInstance, rentalId: string, logId: string) {
  const log = await app.prisma.maintenanceLog.findFirst({
    where: { id: logId, rentalId },
    include: {
      technician: { select: { id: true, name: true } },
      equipment: { select: { id: true, modelName: true } },
    },
  });
  if (!log) throw new NotFoundError('MaintenanceLog', logId);
  return log;
}

export async function createMaintenanceLog(
  app: FastifyInstance,
  rentalId: string,
  performedBy: string,
  data: {
    equipmentId: string;
    type: MaintenanceType;
    visitDate: Date;
    description: string;
    partsUsed?: { name: string; quantity: number; cost?: number }[];
    downtimeHours?: number;
  },
) {
  const rental = await app.prisma.rentalOrder.findUnique({ where: { id: rentalId } });
  if (!rental) throw new NotFoundError('Rental', rentalId);

  const log = await app.prisma.maintenanceLog.create({
    data: {
      rentalId,
      equipmentId: data.equipmentId,
      type: data.type,
      performedBy,
      visitDate: data.visitDate,
      description: data.description,
      partsUsed: data.partsUsed as any,
      downtimeHours: data.downtimeHours ?? 0,
    },
    include: { technician: { select: { id: true, name: true } } },
  });

  // Alert if downtime > 24 hours (log warning — in production this would send notification)
  if ((data.downtimeHours ?? 0) > 24) {
    app.log.warn(
      { rentalId, equipmentId: data.equipmentId, downtimeHours: data.downtimeHours },
      '⚠️ High downtime alert: maintenance visit logged with >24h downtime',
    );
  }

  return log;
}

export async function updateMaintenanceLog(
  app: FastifyInstance,
  rentalId: string,
  logId: string,
  data: Partial<{
    description: string;
    partsUsed: { name: string; quantity: number; cost?: number }[];
    downtimeHours: number;
    visitDate: Date;
  }>,
) {
  await getMaintenanceLog(app, rentalId, logId);
  return app.prisma.maintenanceLog.update({
    where: { id: logId },
    data: {
      ...data,
      partsUsed: data.partsUsed as any,
    },
  });
}
