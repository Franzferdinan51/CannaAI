const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function initializeWithSqlite(rootDir) {
  const databasePath = path.join(rootDir, 'prisma', 'test.db');
  const migrationPath = path.join(rootDir, 'prisma', 'migrations', '20260225084231_init', 'migration.sql');

  // Prefer the checked-in SQL migration when the platform SQLite CLI exists.
  // This avoids invoking a broken or mismatched Prisma schema engine during
  // tests while keeping Prisma as the fallback on platforms without sqlite3.
  execFileSync('sqlite3', [':memory:', 'SELECT 1;'], { stdio: 'ignore', timeout: 2000 });
  const hasSchema = execFileSync('sqlite3', [databasePath, "SELECT 1 FROM sqlite_master WHERE type='table' AND name='PlantAnalysis' LIMIT 1;"], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
  }).trim() === '1';
  if (!hasSchema) {
    execFileSync('sqlite3', [databasePath], {
      cwd: rootDir,
      input: fs.readFileSync(migrationPath, 'utf8'),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
  }
}

module.exports = async function globalSetup() {
  const rootDir = path.resolve(__dirname, '..');

  try {
    initializeWithSqlite(rootDir);
    return;
  } catch {
    // sqlite3 is not guaranteed on every supported platform; use Prisma below.
  }

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
    try {
      initializeWithSqlite(rootDir);
      return;
    } catch (sqliteError) {
      const prismaMessage = prismaError instanceof Error ? prismaError.message : String(prismaError);
      const sqliteMessage = sqliteError instanceof Error ? sqliteError.message : String(sqliteError);
      throw new Error(`Could not initialize the test database. Prisma: ${prismaMessage}; sqlite3 fallback: ${sqliteMessage}`);
    }
  }
};
