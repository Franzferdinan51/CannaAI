# ========================================
# PostgreSQL Initialization
# ========================================

-- Create user and database
CREATE USER cannaai WITH PASSWORD 'secure_password_here';
CREATE DATABASE cannaai_production OWNER cannaai;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cannaai_production TO cannaai;

-- Connect to the database
\c cannaai_production;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO cannaai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cannaai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cannaai;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cannaai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cannaai;

-- Create tables if needed
-- (Prisma will handle schema management)

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;
