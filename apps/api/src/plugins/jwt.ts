import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config';

export default fp(async function jwtPlugin(app: FastifyInstance) {
  app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });
}, { name: 'jwt' });
