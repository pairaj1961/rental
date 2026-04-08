import { FastifyInstance } from 'fastify';
import { NotFoundError } from '../lib/errors/http-error';

export async function listCustomers(app: FastifyInstance, filters: { search?: string; page?: number; limit?: number }) {
  const { search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;
  const where: any = { active: true };

  if (search) {
    where.OR = [
      { customerCode: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await app.prisma.$transaction([
    app.prisma.customer.count({ where }),
    app.prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { companyName: 'asc' },
      include: {
        _count: { select: { jobSites: true, rentals: true } },
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function getCustomer(app: FastifyInstance, id: string) {
  const customer = await app.prisma.customer.findFirst({
    where: { id, active: true },
    include: {
      jobSites: { where: { active: true }, orderBy: { siteName: 'asc' } },
      _count: { select: { rentals: true } },
    },
  });
  if (!customer) throw new NotFoundError('Customer', id);
  return customer;
}

export async function createCustomer(app: FastifyInstance, data: {
  customerCode?: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
}) {
  return app.prisma.customer.create({ data });
}

export async function updateCustomer(app: FastifyInstance, id: string, data: Partial<{
  customerCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
}>) {
  await getCustomer(app, id);
  return app.prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(app: FastifyInstance, id: string) {
  await getCustomer(app, id);
  return app.prisma.customer.update({ where: { id }, data: { active: false } });
}

// Job Sites
export async function listJobSites(app: FastifyInstance, customerId: string) {
  await getCustomer(app, customerId);
  return app.prisma.jobSite.findMany({
    where: { customerId, active: true },
    orderBy: { siteName: 'asc' },
  });
}

export async function createJobSite(app: FastifyInstance, customerId: string, data: {
  siteName: string;
  siteAddress: string;
  siteContactPerson?: string;
  sitePhone?: string;
}) {
  await getCustomer(app, customerId);
  return app.prisma.jobSite.create({ data: { ...data, customerId } });
}

export async function updateJobSite(app: FastifyInstance, customerId: string, siteId: string, data: Partial<{
  siteName: string;
  siteAddress: string;
  siteContactPerson: string;
  sitePhone: string;
  active: boolean;
}>) {
  const site = await app.prisma.jobSite.findFirst({ where: { id: siteId, customerId } });
  if (!site) throw new NotFoundError('JobSite', siteId);
  return app.prisma.jobSite.update({ where: { id: siteId }, data });
}

export async function deleteJobSite(app: FastifyInstance, customerId: string, siteId: string) {
  const site = await app.prisma.jobSite.findFirst({ where: { id: siteId, customerId } });
  if (!site) throw new NotFoundError('JobSite', siteId);
  return app.prisma.jobSite.update({ where: { id: siteId }, data: { active: false } });
}
