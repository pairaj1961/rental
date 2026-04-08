import { FastifyInstance } from 'fastify';
import { RentalStatus, UserRole, isValidTransition, formatRentalNumber } from '@rental/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors/http-error';

export interface RentalFilters {
  status?: RentalStatus;
  customerId?: string;
  equipmentId?: string;
  assignedSales?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listRentals(
  app: FastifyInstance,
  actorId: string,
  actorRole: UserRole,
  filters: RentalFilters,
) {
  const { status, customerId, equipmentId, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};

  // Role-based filtering
  if (actorRole === UserRole.SALES) {
    where.OR = [{ createdBy: actorId }, { assignedSales: actorId }];
  } else if (actorRole === UserRole.SERVICE) {
    where.assignedService = { some: { id: actorId } };
  }

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (equipmentId) where.equipmentId = equipmentId;
  if (search) {
    where.OR = [
      ...(where.OR ?? []),
      { rentalNumber: { contains: search, mode: 'insensitive' } },
      { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      { equipment: { modelName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, items] = await app.prisma.$transaction([
    app.prisma.rentalOrder.count({ where }),
    app.prisma.rentalOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, companyName: true, contactPerson: true } },
        jobSite: { select: { id: true, siteName: true, siteAddress: true } },
        equipment: {
          select: {
            id: true, modelName: true, serialNumber: true, category: true,
            coverPhoto: { select: { filePath: true } },
          },
        },
        creator: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } },
        assignedService: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function getRental(
  app: FastifyInstance,
  id: string,
  actorId: string,
  actorRole: UserRole,
) {
  const rental = await app.prisma.rentalOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      jobSite: true,
      equipment: {
        include: { coverPhoto: true },
      },
      creator: { select: { id: true, name: true, role: true } },
      salesPerson: { select: { id: true, name: true } },
      assignedService: { select: { id: true, name: true } },
      inspections: {
        include: { inspector: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      maintenanceLogs: {
        include: { technician: { select: { id: true, name: true } } },
        orderBy: { visitDate: 'desc' },
      },
      documents: {
        include: { generator: { select: { id: true, name: true } } },
        orderBy: { generatedAt: 'desc' },
      },
    },
  });

  if (!rental) throw new NotFoundError('Rental', id);

  // SALES can only see their own rentals
  if (actorRole === UserRole.SALES) {
    if (rental.createdBy !== actorId && rental.assignedSales !== actorId) {
      throw new ForbiddenError('You do not have access to this rental');
    }
  }

  // SERVICE can only see assigned rentals
  if (actorRole === UserRole.SERVICE) {
    const isAssigned = (rental.assignedService as any[]).some((u: any) => u.id === actorId);
    if (!isAssigned) {
      throw new ForbiddenError('You are not assigned to this rental');
    }
  }

  return rental;
}

export async function createRental(
  app: FastifyInstance,
  actorId: string,
  data: {
    customerId: string;
    jobSiteId: string;
    equipmentId: string;
    rentalStartDate: Date;
    rentalEndDate: Date;
    specialConditions?: string;
    assignedSales?: string;
    assignedServiceIds?: string[];
  },
) {
  // Validate equipment availability
  const equipment = await app.prisma.equipment.findFirst({
    where: { id: data.equipmentId, active: true },
  });
  if (!equipment) throw new NotFoundError('Equipment', data.equipmentId);
  if (equipment.status === 'RENTED') {
    throw new ValidationError('Equipment is currently rented and not available');
  }
  if (equipment.status === 'MAINTENANCE') {
    throw new ValidationError('Equipment is under maintenance and not available');
  }
  if (equipment.status === 'RETIRED') {
    throw new ValidationError('Equipment is retired');
  }

  // Validate customer and job site
  const customer = await app.prisma.customer.findFirst({ where: { id: data.customerId, active: true } });
  if (!customer) throw new NotFoundError('Customer', data.customerId);

  const jobSite = await app.prisma.jobSite.findFirst({
    where: { id: data.jobSiteId, customerId: data.customerId, active: true },
  });
  if (!jobSite) throw new NotFoundError('JobSite', data.jobSiteId);

  // Generate rental number with a transaction to prevent race conditions
  const rentalNumber = await app.prisma.$transaction(async (tx: any) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const count = await tx.rentalOrder.count({
      where: {
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    return formatRentalNumber(today, count + 1);
  });

  const rental = await app.prisma.rentalOrder.create({
    data: {
      rentalNumber,
      customerId: data.customerId,
      jobSiteId: data.jobSiteId,
      equipmentId: data.equipmentId,
      rentalStartDate: data.rentalStartDate,
      rentalEndDate: data.rentalEndDate,
      specialConditions: data.specialConditions,
      createdBy: actorId,
      assignedSales: data.assignedSales,
      assignedService: data.assignedServiceIds
        ? { connect: data.assignedServiceIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      customer: true,
      jobSite: true,
      equipment: true,
      assignedService: { select: { id: true, name: true } },
    },
  });

  return rental;
}

export async function updateRental(
  app: FastifyInstance,
  id: string,
  data: Partial<{
    rentalStartDate: Date;
    rentalEndDate: Date;
    specialConditions: string;
    assignedSales: string;
    assignedServiceIds: string[];
  }>,
) {
  const rental = await app.prisma.rentalOrder.findUnique({ where: { id } });
  if (!rental) throw new NotFoundError('Rental', id);

  if (rental.status === RentalStatus.CLOSED || rental.status === RentalStatus.CANCELLED) {
    throw new ValidationError('Cannot update a closed or cancelled rental');
  }

  const { assignedServiceIds, ...rest } = data;

  return app.prisma.rentalOrder.update({
    where: { id },
    data: {
      ...rest,
      ...(assignedServiceIds !== undefined && {
        assignedService: {
          set: assignedServiceIds.map((sid) => ({ id: sid })),
        },
      }),
    },
    include: {
      customer: true,
      jobSite: true,
      equipment: true,
      assignedService: { select: { id: true, name: true } },
    },
  });
}

export async function transitionRental(
  app: FastifyInstance,
  id: string,
  to: RentalStatus,
  actorId: string,
  actorRole: UserRole,
) {
  const rental = await app.prisma.rentalOrder.findUnique({
    where: { id },
    include: { equipment: true },
  });
  if (!rental) throw new NotFoundError('Rental', id);

  if (!isValidTransition(rental.status as RentalStatus, to)) {
    throw new ValidationError(
      `Cannot transition from '${rental.status}' to '${to}'. Valid transitions: ${
        JSON.stringify(require('@rental/shared').STATUS_TRANSITIONS[rental.status])
      }`,
    );
  }

  // Handle side effects
  const updateData: any = { status: to };

  if (to === RentalStatus.DELIVERED) {
    // Set equipment to RENTED
    await app.prisma.equipment.update({
      where: { id: rental.equipmentId },
      data: { status: 'RENTED' },
    });
  }

  if (to === RentalStatus.CLOSED) {
    updateData.actualReturnDate = new Date();
    // Set equipment back to AVAILABLE
    await app.prisma.equipment.update({
      where: { id: rental.equipmentId },
      data: { status: 'AVAILABLE' },
    });
  }

  if (to === RentalStatus.CANCELLED) {
    // If equipment was rented (delivered), return it to AVAILABLE
    if (['DELIVERED', 'ACTIVE', 'RETURNING'].includes(rental.status)) {
      await app.prisma.equipment.update({
        where: { id: rental.equipmentId },
        data: { status: 'AVAILABLE' },
      });
    }
  }

  return app.prisma.rentalOrder.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, companyName: true } },
      equipment: { select: { id: true, modelName: true } },
    },
  });
}

// ── Equipment Swap ────────────────────────────────────────────────────────────

export async function swapEquipment(
  app: FastifyInstance,
  rentalId: string,
  replacementEquipmentId: string,
  reason: string,
  actorId: string,
) {
  const rental = await app.prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: { equipment: true },
  });
  if (!rental) throw new NotFoundError('Rental', rentalId);

  const SWAPPABLE = [RentalStatus.DELIVERED, RentalStatus.ACTIVE, RentalStatus.RETURNING];
  if (!SWAPPABLE.includes(rental.status as RentalStatus)) {
    throw new ValidationError(
      `Equipment can only be swapped when rental is DELIVERED, ACTIVE or RETURNING (current: ${rental.status})`,
    );
  }

  if (rental.equipmentId === replacementEquipmentId) {
    throw new ValidationError('Replacement equipment must be different from the current one');
  }

  const replacement = await app.prisma.equipment.findFirst({
    where: { id: replacementEquipmentId, active: true },
  });
  if (!replacement) throw new NotFoundError('Equipment', replacementEquipmentId);
  if (replacement.status !== 'AVAILABLE') {
    throw new ValidationError(`Replacement equipment is not available (status: ${replacement.status})`);
  }

  // Run all changes in a single callback-based transaction
  // (array-based $transaction is incompatible with $extends async interceptor)
  const updatedRental = await app.prisma.$transaction(async (tx) => {
    // 1. Update rental to point to new equipment
    const updated = await tx.rentalOrder.update({
      where: { id: rentalId },
      data: { equipmentId: replacementEquipmentId },
      include: {
        customer: { select: { id: true, companyName: true } },
        equipment: { select: { id: true, modelName: true, serialNumber: true } },
      },
    });

    // 2. Old equipment → MAINTENANCE
    await tx.equipment.update({
      where: { id: rental.equipmentId },
      data: { status: 'MAINTENANCE' },
    });

    // 3. New equipment → RENTED
    await tx.equipment.update({
      where: { id: replacementEquipmentId },
      data: { status: 'RENTED' },
    });

    // 4. Maintenance log for old equipment
    await tx.maintenanceLog.create({
      data: {
        rentalId,
        equipmentId: rental.equipmentId,
        performedBy: actorId,
        type: 'REPAIR',
        visitDate: new Date(),
        description: `เครื่องขัดข้องระหว่างเช่า — สลับเป็นเครื่อง ${replacement.modelName} (${replacement.serialNumber}). สาเหตุ: ${reason || 'ไม่ระบุ'}`,
        downtimeHours: 0,
      },
    });

    return updated;
  });

  return updatedRental;
}

export async function getRentalTimeline(app: FastifyInstance, id: string) {
  const rental = await app.prisma.rentalOrder.findUnique({ where: { id } });
  if (!rental) throw new NotFoundError('Rental', id);

  const auditLogs = await app.prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'RentalOrder', entityId: id },
        { entityType: 'InspectionReport', entityId: { in: await getRelatedEntityIds(app, id) } },
      ],
    },
    orderBy: { timestamp: 'asc' },
  });

  return auditLogs;
}

async function getRelatedEntityIds(app: FastifyInstance, rentalId: string): Promise<string[]> {
  const [inspections, maintenanceLogs, documents] = await Promise.all([
    app.prisma.inspectionReport.findMany({ where: { rentalId }, select: { id: true } }),
    app.prisma.maintenanceLog.findMany({ where: { rentalId }, select: { id: true } }),
    app.prisma.document.findMany({ where: { rentalId }, select: { id: true } }),
  ]);

  return [
    ...(inspections as any[]).map((i: any) => i.id),
    ...(maintenanceLogs as any[]).map((m: any) => m.id),
    ...(documents as any[]).map((d: any) => d.id),
  ];
}
