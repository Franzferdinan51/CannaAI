import { PrismaClient } from '@prisma/client'

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
    // Connection pool configuration
    pool: {
      timeout: queryTimeout,
      poolTimeout: 60000, // 60 seconds
    },
    // Transaction configuration
    transactionOptions: {
      timeout: queryTimeout,
    },
    // Error formatting for better debugging
    errorFormat: 'colorless',
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db

  // Add connection event listeners for monitoring
  db.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
      console.log('Query: ' + e.query)
      console.log('Duration: ' + e.duration + 'ms')
      console.log('Params: ' + e.params)
    }
  })

  db.$on('error', (e) => {
    console.error('Database error:', e)
  })
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect()
})

export default db