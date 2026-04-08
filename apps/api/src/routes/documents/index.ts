import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../hooks/authenticate';
import { authorize } from '../../hooks/authorize';
import { getDocumentFilePath } from '../../services/document.service';

const allRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.PRODUCT_MANAGER];

export default async function documentRoutes(app: FastifyInstance) {
  app.get('/:id/download', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const filePath = await getDocumentFilePath(app, id);
    const fileName = path.basename(filePath);
    const stream = fs.createReadStream(filePath);
    return reply
      .header('Content-Disposition', `attachment; filename="${fileName}"`)
      .header('Content-Type', 'application/pdf')
      .send(stream);
  });
}
