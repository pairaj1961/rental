import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { MAX_FILE_SIZE_BYTES } from '@rental/shared';

export default fp(async function multipartPlugin(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 10,
    },
  });
}, { name: 'multipart' });
