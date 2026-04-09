import { FastifyInstance } from 'fastify';
import { UserRole } from '@rental/shared';

export async function getDashboard(app: FastifyInstance, actorId: string, actorRole: UserRole) {
  switch (actorRole) {
    case UserRole.ADMIN:
    case UserRole.MANAGER:
      return getManagerDashboard(app);
    case UserRole.REP:
      return getSalesDashboard(app, actorId);
    case UserRole.PRODUCT_MANAGER:
      return getProductManagerDashboard(app);
    default:
      return getManagerDashboard(app);
  }
}

async function getManagerDashboard(app: FastifyInstance) {
  const now = new Date();

  const [
    totalActiveContracts,
    overdueContracts,
    equipmentStats,
    openMaintenance,
    rentalsByStatus,
  ] = await Promise.all([
    app.prisma.rentalContract.count({ where: { status: 'ACTIVE' } }),
    app.prisma.rentalContract.count({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
        actualReturnDate: null,
      },
    }),
    app.prisma.equipment.groupBy({
      by: ['status'],
      _count: true,
    }),
    app.prisma.maintenanceRecord.count({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
    }),
    app.prisma.rentalContract.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const totalEquipment = (equipmentStats as any[]).reduce((s: number, e: any) => s + e._count, 0);
  const availableEquipment = (equipmentStats as any[]).find((e: any) => e.status === 'AVAILABLE')?._count ?? 0;
  const utilizationRate = totalEquipment > 0
    ? Math.round(((totalEquipment - availableEquipment) / totalEquipment) * 100)
    : 0;

  return {
    role: UserRole.ADMIN,
    kpis: {
      totalActiveContracts,
      overdueContracts,
      utilizationRate,
      openMaintenance,
    },
    equipmentByStatus: Object.fromEntries((equipmentStats as any[]).map((e: any) => [e.status, e._count])),
    rentalsByStatus: Object.fromEntries((rentalsByStatus as any[]).map((r: any) => [r.status, r._count])),
  };
}

async function getSalesDashboard(app: FastifyInstance, actorId: string) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [myActiveContracts, expiringContracts] = await Promise.all([
    app.prisma.rentalContract.count({
      where: {
        assignedRepId: actorId,
        status: 'ACTIVE',
      },
    }),
    app.prisma.rentalContract.findMany({
      where: {
        assignedRepId: actorId,
        status: 'ACTIVE',
        endDate: { gte: now, lte: in7Days },
      },
      orderBy: { endDate: 'asc' },
    }),
  ]);

  return {
    role: UserRole.REP,
    kpis: {
      myActiveContracts,
      expiringThisWeek: expiringContracts.length,
    },
    expiringContracts,
  };
}

async function getProductManagerDashboard(app: FastifyInstance) {
  const [
    equipmentStats,
    scheduledMaintenance,
    upcomingDeliveries,
  ] = await Promise.all([
    app.prisma.equipment.groupBy({
      by: ['status'],
      _count: true,
    }),
    app.prisma.maintenanceRecord.count({
      where: { status: 'SCHEDULED' },
    }),
    app.prisma.deliverySchedule.count({
      where: {
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    role: UserRole.PRODUCT_MANAGER,
    kpis: {
      scheduledMaintenance,
      upcomingDeliveries,
    },
    equipmentByStatus: Object.fromEntries((equipmentStats as any[]).map((e: any) => [e.status, e._count])),
  };
}
