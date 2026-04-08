import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, RentalStatus, DocumentType, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import {
  listRentals,
  getRental,
  createRental,
  updateRental,
  transitionRental,
  getRentalTimeline,
  swapEquipment,
} from '../../services/rental.service';
import { listInspections, getInspection, createInspection, updateInspection } from '../../services/inspection.service';
import { listMaintenanceLogs, getMaintenanceLog, createMaintenanceLog, updateMaintenanceLog } from '../../services/maintenance.service';
import { generateDocument } from '../../services/document.service';
import { InspectionType, MaintenanceType } from '@rental/shared';

const allRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.PRODUCT_MANAGER];
const managers = [UserRole.ADMIN, UserRole.MANAGER];

const createRentalSchema = z.object({
  customerId: z.string().cuid(),
  jobSiteId: z.string().cuid(),
  equipmentId: z.string().cuid(),
  rentalStartDate: z.coerce.date(),
  rentalEndDate: z.coerce.date(),
  specialConditions: z.string().optional(),
  assignedSales: z.string().cuid().optional(),
  assignedServiceIds: z.array(z.string().cuid()).optional(),
});

const updateRentalSchema = z.object({
  rentalStartDate: z.coerce.date().optional(),
  rentalEndDate: z.coerce.date().optional(),
  specialConditions: z.string().optional(),
  assignedSales: z.string().cuid().optional(),
  assignedServiceIds: z.array(z.string().cuid()).optional(),
});

export default async function rentalRoutes(app: FastifyInstance) {
  // GET /rentals
  app.get('/', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { status, customerId, equipmentId, search, page, limit } = request.query as any;
    const result = await listRentals(app, request.user.sub, request.user.role as UserRole, {
      status,
      customerId,
      equipmentId,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 100) : 20,
    });
    return reply.status(200).send(successResponse(result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    }));
  });

  // POST /rentals
  app.post('/', { preHandler: [authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.REP])] }, async (request, reply) => {
    const body = createRentalSchema.parse(request.body);
    const rental = await createRental(app, request.user.sub, body);
    return reply.status(201).send(successResponse(rental));
  });

  // GET /rentals/:id
  app.get('/:id', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rental = await getRental(app, id, request.user.sub, request.user.role as UserRole);
    return reply.status(200).send(successResponse(rental));
  });

  // PUT /rentals/:id
  app.put('/:id', { preHandler: [authenticate, authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.REP])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateRentalSchema.parse(request.body);
    const rental = await updateRental(app, id, body);
    return reply.status(200).send(successResponse(rental));
  });

  // POST /rentals/:id/transition
  app.post('/:id/transition', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { to } = request.body as { to: RentalStatus };
    if (!Object.values(RentalStatus).includes(to)) {
      return reply.status(400).send({ success: false, data: null, error: { code: 'INVALID_STATUS', message: `Invalid status: ${to}` }, meta: null });
    }
    const rental = await transitionRental(app, id, to, request.user.sub, request.user.role as UserRole);
    return reply.status(200).send(successResponse(rental));
  });

  // POST /rentals/:id/swap-equipment
  app.post('/:id/swap-equipment', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { replacementEquipmentId, reason } = request.body as { replacementEquipmentId: string; reason?: string };
    if (!replacementEquipmentId) {
      return reply.status(400).send({ success: false, data: null, error: { code: 'MISSING_FIELD', message: 'replacementEquipmentId is required' }, meta: null });
    }
    const rental = await swapEquipment(app, id, replacementEquipmentId, reason ?? '', request.user.sub);
    return reply.status(200).send(successResponse(rental));
  });

  // GET /rentals/:id/timeline
  app.get('/:id/timeline', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const timeline = await getRentalTimeline(app, id);
    return reply.status(200).send(successResponse(timeline));
  });

  // POST /rentals/:id/documents
  app.post('/:id/documents', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { type } = request.body as { type: DocumentType };
    if (!Object.values(DocumentType).includes(type)) {
      return reply.status(400).send({ success: false, data: null, error: { code: 'INVALID_TYPE', message: `Invalid document type: ${type}` }, meta: null });
    }
    const doc = await generateDocument(app, id, type, request.user.sub);
    return reply.status(201).send(successResponse(doc));
  });

  // ── Inspections ──────────────────────────────────────────────────────────

  const serviceAndManager = [UserRole.ADMIN, UserRole.MANAGER, UserRole.PRODUCT_MANAGER];

  app.get('/:id/inspections', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const inspections = await listInspections(app, id);
    return reply.status(200).send(successResponse(inspections));
  });

  app.post('/:id/inspections', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const report = await createInspection(app, id, request.user.sub, {
      type: body.type as InspectionType,
      inspectionDate: new Date(body.inspectionDate),
      checklistItems: body.checklistItems,
      overallCondition: body.overallCondition,
      damageNotes: body.damageNotes,
      customerSignature: body.customerSignature,
      photos: body.photos,
    });
    return reply.status(201).send(successResponse(report));
  });

  app.get('/:id/inspections/:inspId', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id, inspId } = request.params as { id: string; inspId: string };
    const report = await getInspection(app, id, inspId);
    return reply.status(200).send(successResponse(report));
  });

  app.put('/:id/inspections/:inspId', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id, inspId } = request.params as { id: string; inspId: string };
    const body = request.body as any;
    const report = await updateInspection(app, id, inspId, body);
    return reply.status(200).send(successResponse(report));
  });

  // ── Maintenance Logs ─────────────────────────────────────────────────────

  app.get('/:id/maintenance', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const logs = await listMaintenanceLogs(app, id);
    return reply.status(200).send(successResponse(logs));
  });

  app.post('/:id/maintenance', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const log = await createMaintenanceLog(app, id, request.user.sub, {
      equipmentId: body.equipmentId,
      type: body.type as MaintenanceType,
      visitDate: new Date(body.visitDate),
      description: body.description,
      partsUsed: body.partsUsed,
      downtimeHours: body.downtimeHours,
    });
    return reply.status(201).send(successResponse(log));
  });

  app.get('/:id/maintenance/:logId', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id, logId } = request.params as { id: string; logId: string };
    const log = await getMaintenanceLog(app, id, logId);
    return reply.status(200).send(successResponse(log));
  });

  app.put('/:id/maintenance/:logId', { preHandler: [authenticate, authorize(serviceAndManager)] }, async (request, reply) => {
    const { id, logId } = request.params as { id: string; logId: string };
    const body = request.body as any;
    const log = await updateMaintenanceLog(app, id, logId, body);
    return reply.status(200).send(successResponse(log));
  });
}
