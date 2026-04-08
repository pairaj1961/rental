import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { DocumentType } from '@rental/shared';
import { NotFoundError, ValidationError } from '../lib/errors/http-error';
import { config } from '../config';
import { generateDeliveryNote } from '../lib/pdf/templates/delivery-note';
import { generateRentalContract } from '../lib/pdf/templates/rental-contract';
import { generateInspectionForm } from '../lib/pdf/templates/inspection-form';
import { generateReturnForm } from '../lib/pdf/templates/return-form';
import { ChecklistItem } from '@rental/shared';

const uploadsDir = path.resolve(process.cwd(), config.UPLOADS_DIR);

export async function generateDocument(
  app: FastifyInstance,
  rentalId: string,
  type: DocumentType,
  generatedBy: string,
) {
  const rental = await app.prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: {
      customer: true,
      jobSite: true,
      equipment: true,
      inspections: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!rental) throw new NotFoundError('Rental', rentalId);

  const docId = uuidv4();
  const docNumber = `${rental.rentalNumber}-${type.slice(0, 3)}-${docId.slice(0, 6).toUpperCase()}`;
  const outputDir = path.join(uploadsDir, 'documents', rentalId);
  const fileName = `${docId}.pdf`;
  const outputPath = path.join(outputDir, fileName);
  const fileUrl = `documents/${rentalId}/${fileName}`;

  await fs.promises.mkdir(outputDir, { recursive: true });

  const date = new Date();

  switch (type) {
    case DocumentType.DELIVERY_NOTE:
      await generateDeliveryNote(
        {
          docNumber,
          rentalNumber: rental.rentalNumber,
          date,
          customer: { ...rental.customer, address: rental.customer.address ?? undefined },
          jobSite: { ...rental.jobSite, siteContactPerson: rental.jobSite.siteContactPerson ?? undefined, sitePhone: rental.jobSite.sitePhone ?? undefined },
          equipment: rental.equipment,
          rentalStart: rental.rentalStartDate,
          rentalEnd: rental.rentalEndDate,
          serviceTeam: 'Tools Act Service Team',
          specialConditions: rental.specialConditions ?? undefined,
        },
        outputPath,
      );
      break;

    case DocumentType.RENTAL_CONTRACT:
      await generateRentalContract(
        {
          docNumber,
          rentalNumber: rental.rentalNumber,
          date,
          customer: {
            ...rental.customer,
            address: rental.customer.address ?? undefined,
            taxId: rental.customer.taxId ?? undefined,
          },
          equipment: rental.equipment,
          jobSite: { siteName: rental.jobSite.siteName, siteAddress: rental.jobSite.siteAddress },
          rentalStart: rental.rentalStartDate,
          rentalEnd: rental.rentalEndDate,
          specialConditions: rental.specialConditions ?? undefined,
        },
        outputPath,
      );
      break;

    case DocumentType.INSPECTION_FORM: {
      const inspection = rental.inspections[0];
      if (!inspection) throw new ValidationError('No inspection report found for this rental');

      const inspector = await app.prisma.user.findUnique({
        where: { id: inspection.inspectedBy },
        select: { name: true },
      });

      await generateInspectionForm(
        {
          docNumber,
          rentalNumber: rental.rentalNumber,
          date,
          type: inspection.type,
          equipment: rental.equipment,
          inspector: inspector?.name ?? 'Unknown',
          checklistItems: (inspection.checklistItems as unknown) as ChecklistItem[],
          overallCondition: inspection.overallCondition,
          damageNotes: inspection.damageNotes ?? undefined,
        },
        outputPath,
      );
      break;
    }

    case DocumentType.RETURN_FORM: {
      const returnInspection = await app.prisma.inspectionReport.findFirst({
        where: { rentalId, type: 'RETURN' },
        orderBy: { createdAt: 'desc' },
      });

      await generateReturnForm(
        {
          docNumber,
          rentalNumber: rental.rentalNumber,
          date,
          customer: rental.customer,
          equipment: rental.equipment,
          rentalStart: rental.rentalStartDate,
          actualReturn: rental.actualReturnDate ?? new Date(),
          overallCondition: returnInspection?.overallCondition ?? 3,
          damageNotes: returnInspection?.damageNotes ?? undefined,
        },
        outputPath,
      );
      break;
    }

    default:
      throw new ValidationError(`Unknown document type: ${type}`);
  }

  return app.prisma.document.create({
    data: {
      rentalId,
      type,
      fileUrl,
      generatedBy,
    },
    include: { generator: { select: { id: true, name: true } } },
  });
}

export async function getDocumentFilePath(app: FastifyInstance, docId: string): Promise<string> {
  const doc = await app.prisma.document.findUnique({ where: { id: docId } });
  if (!doc) throw new NotFoundError('Document', docId);

  const fullPath = path.join(uploadsDir, doc.fileUrl);
  if (!fs.existsSync(fullPath)) {
    throw new NotFoundError('Document file not found on disk');
  }

  return fullPath;
}
