import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError } from './http-error';
import { errorResponse } from '@rental/shared';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) => {
    // Known application errors
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(
        errorResponse(error.code, error.message, error.details),
      );
    }

    // Prisma known errors
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const field = (error.meta?.target as string[])?.join(', ') ?? 'field';
          return reply.status(409).send(errorResponse('CONFLICT', `${field} already exists`));
        }
        case 'P2025':
          return reply.status(404).send(errorResponse('NOT_FOUND', 'Record not found'));
        case 'P2003':
          return reply.status(400).send(errorResponse('FOREIGN_KEY_VIOLATION', 'Referenced record does not exist'));
        default:
          app.log.error({ err: error, code: error.code }, 'Prisma error');
          return reply.status(500).send(errorResponse('DATABASE_ERROR', 'Database operation failed'));
      }
    }

    // Fastify validation errors (status 400)
    if ('validation' in error && error.validation) {
      return reply.status(400).send(
        errorResponse('VALIDATION_ERROR', error.message, error.validation),
      );
    }

    // JWT errors
    if (error.message?.includes('jwt') || error.message?.includes('token') || error.message?.includes('Unauthorized')) {
      return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Invalid or expired token'));
    }

    // HTTP errors from @fastify/sensible
    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send(errorResponse('CLIENT_ERROR', error.message));
    }

    // Unexpected server errors — log stack trace
    app.log.error({ err: error }, 'Unhandled server error');
    return reply.status(500).send(errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'));
  });
}
