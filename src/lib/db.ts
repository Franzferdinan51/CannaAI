import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logLevel = (process.env.PRISMA_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'query')) as any;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: Array.isArray(logLevel) ? logLevel : [logLevel],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db