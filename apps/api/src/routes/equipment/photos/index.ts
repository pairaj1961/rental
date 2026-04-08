import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { UserRole, successResponse } from '@rental/shared';
import { authenticate } from '../../../hooks/authenticate';
import { authorize } from '../../../hooks/authorize';
import { uploadPhoto, listPhotos, updatePhoto, deletePhoto } from '../../../services/photo.service';
import { config } from '../../../config';
import { NotFoundError } from '../../../lib/errors/http-error';

const uploadsDir = path.resolve(process.cwd(), config.UPLOADS_DIR);

export default async function photoRoutes(app: FastifyInstance) {
  const allRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.PRODUCT_MANAGER];
  const uploaders = [UserRole.ADMIN, UserRole.MANAGER, UserRole.PRODUCT_MANAGER];
  const managers = [UserRole.ADMIN, UserRole.MANAGER];

  // POST /equipment/:id/photos — upload
  app.post('/', { preHandler: [authenticate, authorize(uploaders)] }, async (request, reply) => {
    const { id: equipmentId } = request.params as { id: string };
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, data: null, error: { code: 'NO_FILE', message: 'No file uploaded' }, meta: null });
    }

    const buffer = await data.toBuffer();
    const result = await uploadPhoto(app, equipmentId, request.user.sub, buffer, data.mimetype, data.filename);
    return reply.status(201).send(successResponse(result));
  });

  // GET /equipment/:id/photos
  app.get('/', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { id: equipmentId } = request.params as { id: string };
    const photos = await listPhotos(app, equipmentId);
    return reply.status(200).send(successResponse(photos));
  });

  // PATCH /equipment/:id/photos/:photoId
  app.patch('/:photoId', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id: equipmentId, photoId } = request.params as { id: string; photoId: string };
    const body = request.body as { caption?: string; isCover?: boolean };
    const result = await updatePhoto(app, equipmentId, photoId, body);
    return reply.status(200).send(successResponse(result));
  });

  // DELETE /equipment/:id/photos/:photoId
  app.delete('/:photoId', { preHandler: [authenticate, authorize(managers)] }, async (request, reply) => {
    const { id: equipmentId, photoId } = request.params as { id: string; photoId: string };
    const result = await deletePhoto(app, equipmentId, photoId);
    return reply.status(200).send(successResponse(result));
  });

  // GET /equipment/:id/photos/:photoId/download
  app.get('/:photoId/download', { preHandler: [authenticate, authorize(allRoles)] }, async (request, reply) => {
    const { id: equipmentId, photoId } = request.params as { id: string; photoId: string };
    const photo = await app.prisma.equipmentPhoto.findFirst({ where: { id: photoId, equipmentId } });
    if (!photo) throw new NotFoundError('Photo', photoId);

    const filePath = path.join(uploadsDir, photo.filePath);
    if (!fs.existsSync(filePath)) throw new NotFoundError('Photo file');

    const stream = fs.createReadStream(filePath);
    return reply
      .header('Content-Disposition', `attachment; filename="${photo.fileName}"`)
      .header('Content-Type', 'image/jpeg')
      .send(stream);
  });
}
