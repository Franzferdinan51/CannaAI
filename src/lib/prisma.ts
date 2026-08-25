import { PrismaClient } from '@prisma/client';

// The default schema is SQLite, so a clean local checkout should have a
// usable database URL even before a .env.local file is created. Deployments
// can still override this with DATABASE_URL (PostgreSQL or another supported
// Prisma datasource) before the client is constructed.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
