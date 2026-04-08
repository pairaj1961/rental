import { FastifyInstance } from 'fastify';
import { InspectionType, ChecklistItem } from '@rental/shared';
import { NotFoundError } from '../lib/errors/http-error';

export async function listInspections(app: FastifyInstance, rentalId: string) {
  const rental = await app.prisma.rentalOrder.findUnique({ where: { id: rentalId } });
  if (!rental) throw new NotFoundError('Rental', rentalId);

  return app.prisma.inspectionReport.findMany({
    where: { rentalId },
    orderBy: { createdAt: 'desc' },
    include: { inspector: { select: { id: true, name: true } } },
  });
}

export async function getInspection(app: FastifyInstance, rentalId: string, inspId: string) {
  const report = await app.prisma.inspectionReport.findFirst({
    where: { id: inspId, rentalId },
    include: { inspector: { select: { id: true, name: true } } },
  });
  if (!report) throw new NotFoundError('InspectionReport', inspId);
  return report;
}

export async function createInspection(
  app: FastifyInstance,
  rentalId: string,
  inspectedBy: string,
  data: {
    type: InspectionType;
    inspectionDate: Date;
    checklistItems: ChecklistItem[];
    overallCondition: number;
    damageNotes?: string;
    customerSignature?: string;
    photos?: string[];
  },
) {
  const rental = await app.prisma.rentalOrder.findUnique({ where: { id: rentalId } });
  if (!rental) throw new NotFoundError('Rental', rentalId);

  return app.prisma.inspectionReport.create({
    data: {
      rentalId,
      inspectedBy,
      type: data.type,
      inspectionDate: data.inspectionDate,
      checklistItems: data.checklistItems as any,
      overallCondition: data.overallCondition,
      damageNotes: data.damageNotes,
      customerSignature: data.customerSignature,
      photos: data.photos ?? [],
    },
    include: { inspector: { select: { id: true, name: true } } },
  });
}

export async function updateInspection(
  app: FastifyInstance,
  rentalId: string,
  inspId: string,
  data: Partial<{
    checklistItems: ChecklistItem[];
    overallCondition: number;
    damageNotes: string;
    customerSignature: string;
    photos: string[];
  }>,
) {
  await getInspection(app, rentalId, inspId);
  return app.prisma.inspectionReport.update({
    where: { id: inspId },
    data: {
      ...data,
      checklistItems: data.checklistItems as any,
    },
  });
}
