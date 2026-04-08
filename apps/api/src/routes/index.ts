import { FastifyInstance } from 'fastify';
import authRoutes from './auth/index';
import equipmentRoutes from './equipment/index';
import customerRoutes from './customers/index';
import rentalRoutes from './rentals/index';
import dashboardRoutes from './dashboard/index';
import reportRoutes from './reports/index';
import auditLogRoutes from './audit-logs/index';
import documentRoutes from './documents/index';
import userRoutes from './users/index';

export default async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(equipmentRoutes, { prefix: '/api/v1/equipment' });
  app.register(customerRoutes, { prefix: '/api/v1/customers' });
  app.register(rentalRoutes, { prefix: '/api/v1/rentals' });
  app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  app.register(reportRoutes, { prefix: '/api/v1/reports' });
  app.register(auditLogRoutes, { prefix: '/api/v1/audit-logs' });
  app.register(documentRoutes, { prefix: '/api/v1/documents' });
  app.register(userRoutes, { prefix: '/api/v1/users' });
}
