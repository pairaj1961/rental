import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from '../config';

export default fp(async function staticPlugin(app: FastifyInstance) {
  const uploadsPath = path.resolve(process.cwd(), config.UPLOADS_DIR);
  app.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
  });
}, { name: 'static' });
