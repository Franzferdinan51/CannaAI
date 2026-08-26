const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function globalSetup() {
  const rootDir = path.resolve(__dirname, '..');
  const prismaBin = path.join(rootDir, 'node_modules', '.bin', 'prisma');
  const env = {
    ...process.env,
    // Prisma resolves this URL relative to prisma/schema.prisma.
    DATABASE_URL: 'file:./test.db',
  };

  try {
    execFileSync(prismaBin, ['db', 'push', '--skip-generate', '--accept-data-loss'], {
      cwd: rootDir,
      env,
      stdio: 'pipe',
      // The Prisma schema engine can hang indefinitely on a broken local
      // installation. Test setup must fail over to the deterministic SQLite
      // migration instead of holding every Jest invocation forever.
      timeout: 10000,
      killSignal: 'SIGTERM',
    });
    return;
  } catch (prismaError) {
    // Some local Prisma distributions cannot start the schema engine even
    // though the generated client works. The checked-in initial migration is
    // the authoritative SQLite schema, so use the platform sqlite3 CLI as a
    // deterministic test-only fallback instead of leaving an empty database.
    const databasePath = path.join(rootDir, 'prisma', 'test.db');
    const migrationPath = path.join(rootDir, 'prisma', 'migrations', '20260225084231_init', 'migration.sql');
    try {
      const hasSchema = execFileSync('sqlite3', [databasePath, "SELECT 1 FROM sqlite_master WHERE type='table' AND name='PlantAnalysis' LIMIT 1;"], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim() === '1';
      if (!hasSchema) {
        execFileSync('sqlite3', [databasePath], {
          cwd: rootDir,
          input: fs.readFileSync(migrationPath, 'utf8'),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      }
      return;
    } catch (sqliteError) {
      const prismaMessage = prismaError instanceof Error ? prismaError.message : String(prismaError);
      const sqliteMessage = sqliteError instanceof Error ? sqliteError.message : String(sqliteError);
      throw new Error(`Could not initialize the test database. Prisma: ${prismaMessage}; sqlite3 fallback: ${sqliteMessage}`);
    }
  }
};
