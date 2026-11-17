import { PrismaClient } from '@prisma/client'
import { getLogger } from './logger'

const log = getLogger().child({ tag: '[DB]' })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure logging level
const logLevel = (process.env.PRISMA_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'query')) as any;

// Configure query timeout (in milliseconds)
const queryTimeout = parseInt(process.env.PRISMA_QUERY_TIMEOUT || '30000'); // 30 seconds default

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: Array.isArray(logLevel) ? logLevel : [logLevel],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Error formatting for better debugging
    errorFormat: 'colorless',
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db

  // Add connection event listeners for monitoring
  db.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
      log.debug('db.query', { query: e.query, durationMs: e.duration })
    }
  })

  db.$on('error', (e) => {
    log.error('db.error', { error: (e as any)?.message ?? String(e) })
  })
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect()
})

export default db