#!/usr/bin/env tsx
/**
 * ========================================
 * Database Backup Script
 * ========================================
 * Automated database backup with retention
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const DATABASE_URL = process.env.DATABASE_URL || 'file:./db/production.db';

const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const createBackupDirectory = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log('Backup directory created');
  }
};

const createBackup = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `cannaai-backup-${timestamp}.db`);

  log('Starting database backup...');

  try {
    // Copy database file
    if (DATABASE_URL.startsWith('file:')) {
      const dbPath = DATABASE_URL.replace('file:', '');
      execSync(`cp "${dbPath}" "${backupFile}"`);
      log(`Database backed up to: ${backupFile}`);
    } else {
      // PostgreSQL backup
      execSync(`pg_dump "${DATABASE_URL}" > "${backupFile}"`);
      log(`PostgreSQL database backed up to: ${backupFile}`);
    }

    // Compress backup
    execSync(`gzip "${backupFile}"`);
    log(`Backup compressed: ${backupFile}.gz`);

    return `${backupFile}.gz`;
  } catch (error) {
    log(`Backup failed: ${error}`);
    throw error;
  }
};

const cleanupOldBackups = () => {
  log('Cleaning up old backups...');

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('cannaai-backup-') && file.endsWith('.db.gz'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  let deletedCount = 0;
  for (const file of files) {
    if (file.mtime < cutoffDate) {
      fs.unlinkSync(file.path);
      log(`Deleted old backup: ${file.name}`);
      deletedCount++;
    }
  }

  log(`Cleanup completed. Deleted ${deletedCount} old backups.`);
};

const main = () => {
  log('========================================');
  log('Database Backup Script');
  log('========================================');

  try {
    createBackupDirectory();
    createBackup();
    cleanupOldBackups();

    log('========================================');
    log('Backup completed successfully!');
    log('========================================');

    process.exit(0);
  } catch (error) {
    log('========================================');
    log('Backup failed!');
    log('========================================');

    process.exit(1);
  }
};

main();
