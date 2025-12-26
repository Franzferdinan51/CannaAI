# Comprehensive Data Export/Import System Documentation

## Overview

This document describes the comprehensive export/import system for CultivAI Pro's photo analysis data, built in Iteration 17. The system supports multiple export formats, selective data filtering, image handling, backup/restore functionality, and data migration capabilities.

## System Architecture

### Core Components

1. **Export/Import Utilities** (`src/lib/export-import-utils.ts`)
   - ExportManager: Handles export job creation and processing
   - ImportManager: Validates and processes import data
   - ImageHandler: Compresses and manages images
   - BackupManager: Full database backup/restore
   - MigrationManager: Schema-compatible data migration

2. **API Endpoints**

   **Export Endpoints:**
   - `POST /api/export/create` - Create export job
   - `GET /api/export/[id]` - Download export file
   - `GET /api/export/history` - List export history
   - `POST /api/export/schedule` - Schedule regular exports

   **Import Endpoints:**
   - `POST /api/import/upload` - Upload import file
   - `POST /api/import/validate` - Validate import data
   - `POST /api/import/execute` - Execute import
   - `GET /api/import/history` - List import history

   **Backup/Restore Endpoints:**
   - `POST /api/backup/create` - Create full backup
   - `POST /api/backup/restore` - Restore from backup
   - `GET /api/backup/list` - List available backups

   **Migration Endpoints:**
   - `POST /api/migration/export` - Export for migration
   - `POST /api/migration/import` - Import migrated data

3. **UI Components**
   - `ExportWizard.tsx` - Multi-step export wizard
   - `ImportWizard.tsx` - Multi-step import wizard
   - `BackupRestoreWizard.tsx` - Backup and restore interface

## Features Implemented

### 1. Export Functionality

#### Supported Formats
- **JSON**: Full structured data with all metadata
- **CSV**: Spreadsheet-compatible format
- **PDF**: Formatted reports with charts
- **ZIP**: Complete backup with images
- **XML**: Alternative structured format
- **Excel (.xlsx)**: Business-friendly format

#### Selective Export Filters
- **Date Range**: Filter by start and end dates
- **Plant IDs**: Export analyses for specific plants
- **Strain IDs**: Export analyses for specific strains
- **Analysis Types**: Filter by analysis type (photo, trichome, health, etc.)
- **Tags**: Filter by custom tags
- **Include Images**: Option to include/exclude images
- **Image Quality**: High (90%), Medium (70%), Low (50%)
- **Custom Fields**: Choose specific data to include (plants, strains, rooms, sensors, automation rules, notifications)

#### Export Features
- Background processing for large exports
- Progress tracking
- Export job history
- Scheduled exports (daily, weekly, monthly)
- Metadata inclusion
- Thumbnail generation

### 2. Import Functionality

#### Supported Formats
- JSON (primary format)
- CSV (converted during import)
- XML (converted during import)
- ZIP (with multiple files)
- Excel (.xlsx) (converted during import)

#### Import Options
- **Merge Mode**:
  - `merge`: Combine with existing data
  - `replace`: Overwrite existing data
  - `skip-duplicates`: Skip duplicate records

- **Conflict Resolution**:
  - `keep-existing`: Keep current data
  - `overwrite`: Overwrite with new data
  - `create-copy`: Create duplicate with new ID

#### Validation Features
- File format validation
- Data structure validation
- Duplicate detection
- Schema compatibility check
- Error reporting
- Warning generation
- Preview before import

#### Import Features
- Batch processing
- Error handling and recovery
- Skip errors option
- Progress tracking
- Import history
- Detailed import report

### 3. Image Handling

#### Features
- **Compression**: Automatic image compression
  - High quality: 90%
  - Medium quality: 70%
  - Low quality: 50%

- **Resizing**: Automatic resizing for export
  - Respects max width/height limits
  - Maintains aspect ratio

- **Thumbnails**: Generate thumbnails for preview
  - Default size: 200x200 pixels
  - 60% JPEG quality

- **Format Support**:
  - JPEG (default for photos)
  - PNG (for graphics)
  - WebP (modern format)

- **Metadata Extraction**:
  - Image dimensions
  - File size
  - Format
  - Color profile

### 4. Backup & Restore

#### Backup Types
- **Full Backup**: Complete database with all data and images
- **Incremental Backup**: Only changed data since last backup
- **Selective Backup**: Choose specific data to backup

#### Backup Features
- Automated scheduling
- Backup verification
- Cloud storage integration ready
- Backup compression
- Multiple backup retention

#### Restore Features
- Full database restore
- Restore verification
- Automatic backup before restore
- Rollback capability
- Data integrity checks

### 5. Data Migration

#### Features
- **Schema Versioning**: Track source and target versions
- **Compatibility Checks**: Validate migration compatibility
- **Data Transformation**: Transform data for target version
- **Rollback Capability**: Rollback failed migrations
- **Migration History**: Track all migrations

#### Migration Process
1. Export data with version metadata
2. Validate compatibility
3. Apply transformations
4. Import to target system
5. Verify integrity

## API Usage Examples

### Creating an Export

```typescript
const response = await fetch('/api/export/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    format: 'json',
    filters: {
      dateRange: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z'
      },
      includeImages: true,
      imageQuality: 'high'
    },
    includeMetadata: true,
    customFields: ['plants', 'strains', 'sensors']
  })
});

const data = await response.json();
// Returns: { success: true, jobId: 'uuid' }
```

### Downloading Export

```typescript
// Wait for export to complete
const jobResponse = await fetch(`/api/export/${jobId}`);
const job = await jobResponse.json();

if (job.status === 'completed') {
  // Download the file
  window.location.href = `/api/export/${jobId}`;
}
```

### Uploading and Importing Data

```typescript
// 1. Upload file
const formData = new FormData();
formData.append('file', file);

const uploadResponse = await fetch('/api/import/upload', {
  method: 'POST',
  body: formData
});
const uploadData = await uploadResponse.json();

// 2. Validate
const validateResponse = await fetch('/api/import/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileId: uploadData.importId,
    options: {
      mergeMode: 'merge',
      conflictResolution: 'keep-existing'
    }
  })
});
const validation = await validateResponse.json();

// 3. Execute import if valid
if (validation.valid) {
  const importResponse = await fetch('/api/import/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId: uploadData.importId,
      options: {
        mergeMode: 'merge',
        skipErrors: true
      }
    })
  });
  const result = await importResponse.json();
}
```

### Creating a Backup

```typescript
const response = await fetch('/api/backup/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    includeImages: true,
    type: 'full'
  })
});
const data = await response.json();
// Returns: { success: true, backupId: 'path/to/backup' }
```

### Restoring from Backup

```typescript
const response = await fetch('/api/backup/restore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    backupId: 'backup-id',
    createBackupBeforeRestore: true
  })
});
```

## UI Components

### Export Wizard

```typescript
import { ExportWizard } from '@/components/export-import/ExportWizard';

<ExportWizard
  onExportComplete={(jobId) => {
    console.log('Export created:', jobId);
  }}
  onClose={() => {
    setShowWizard(false);
  }}
/>
```

### Import Wizard

```typescript
import { ImportWizard } from '@/components/export-import/ImportWizard';

<ImportWizard
  onImportComplete={(result) => {
    console.log('Import completed:', result);
  }}
  onClose={() => {
    setShowWizard(false);
  }}
/>
```

### Backup/Restore Wizard

```typescript
import { BackupRestoreWizard } from '@/components/export-import/BackupRestoreWizard';

<BackupRestoreWizard
  onClose={() => {
    setShowWizard(false);
  }}
/>
```

## Database Models

### Exported Data Structure

```json
{
  "exportInfo": {
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "format": "json",
    "recordCounts": {
      "analyses": 150,
      "plants": 50,
      "strains": 10
    }
  },
  "data": {
    "analyses": [
      {
        "id": "analysis-uuid",
        "plantId": "plant-uuid",
        "plantName": "Plant Name",
        "strain": "Purple Haze",
        "analysisType": "photo",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "data": {
          "diagnosis": "...",
          "healthScore": 85,
          "severity": "mild",
          "confidence": 90,
          "recommendations": [...]
        },
        "imageInfo": {
          "originalSize": 1048576,
          "compressedSize": 524288,
          "dimensions": "1200x1200",
          "format": "jpeg",
          "qualityLevel": 90
        },
        "metadata": {
          "provider": "openrouter",
          "processingTime": 2500
        }
      }
    ],
    "plants": [...],
    "strains": [...],
    "rooms": [...],
    "sensors": [...],
    "automationRules": [...],
    "notifications": [...]
  }
}
```

## Security Considerations

1. **File Validation**: All uploaded files are validated for type and format
2. **Rate Limiting**: Export/import operations are rate limited
3. **Data Sanitization**: Input data is sanitized before processing
4. **Error Handling**: Comprehensive error handling prevents data corruption
5. **Backup Before Restore**: Automatic backup before restore operations
6. **Transaction Safety**: Import operations use database transactions

## Performance Optimization

1. **Background Processing**: Large exports run asynchronously
2. **Image Compression**: Automatic compression for faster downloads
3. **Batch Processing**: Bulk import operations
4. **Pagination**: Export history paginated for performance
5. **Compression**: ZIP format for efficient storage
6. **Caching**: Export jobs cached for download

## Error Handling

### Export Errors
- Invalid format specification
- Data gathering failures
- File system errors
- Image processing errors
- Job timeout

### Import Errors
- Invalid file format
- Data validation failures
- Duplicate conflicts
- Database errors
- Schema incompatibilities

### Backup/Restore Errors
- Backup creation failures
- File not found
- Restore verification failures
- Disk space errors
- Corruption detection

## Testing Scenarios

### Export Tests
1. ✅ Export all data in JSON format
2. ✅ Export with date range filter
3. ✅ Export with plant ID filter
4. ✅ Export with image compression
5. ✅ Export large dataset (1000+ analyses)
6. ✅ Export to ZIP format
7. ✅ Export with custom fields
8. ✅ Export with metadata

### Import Tests
1. ✅ Import valid JSON data
2. ✅ Import with duplicate handling
3. ✅ Import with conflict resolution
4. ✅ Import large dataset
5. ✅ Import with validation errors
6. ✅ Import with skip errors option
7. ✅ Import with merge mode
8. ✅ Import with replace mode

### Backup/Restore Tests
1. ✅ Create full backup
2. ✅ List backups
3. ✅ Restore from backup
4. ✅ Verify backup integrity
5. ✅ Automatic backup before restore
6. ✅ Backup with images
7. ✅ Backup compression

### Image Handling Tests
1. ✅ Compress high-quality images
2. ✅ Generate thumbnails
3. ✅ Preserve metadata
4. ✅ Handle multiple formats
5. ✅ Resize large images
6. ✅ Batch image processing

## Future Enhancements

1. **Cloud Integration**:
   - Export to Google Drive
   - Export to Dropbox
   - Export to AWS S3
   - Cloud backup scheduling

2. **Advanced Filtering**:
   - Tag-based filtering
   - Advanced search
   - Saved filters
   - Filter templates

3. **Enhanced Formats**:
   - Parquet export
   - Database dump
   - GraphQL export
   - API export

4. **Collaboration**:
   - Share exports
   - Team imports
   - Permission controls
   - Audit logs

5. **Automation**:
   - Cron-based scheduling
   - Trigger-based exports
   - Webhook notifications
   - Email alerts

## Troubleshooting

### Common Issues

1. **Export Timeout**:
   - Large datasets may timeout
   - Solution: Use ZIP format or filter data

2. **Image Compression Fails**:
   - Corrupted images
   - Solution: Check image format and integrity

3. **Import Validation Errors**:
   - Incorrect data format
   - Solution: Use export format as template

4. **Backup Restore Fails**:
   - Version incompatibility
   - Solution: Use migration tool first

5. **File Upload Fails**:
   - File too large
   - Solution: Split into smaller files

### Support

For issues or questions:
1. Check export/import history for error details
2. Review server logs
3. Validate data format
4. Test with smaller datasets
5. Verify permissions and disk space

## Conclusion

This comprehensive export/import system provides robust data management capabilities for CultivAI Pro's photo analysis data. It supports multiple formats, handles images efficiently, provides backup/restore functionality, and ensures data integrity throughout the process.

The system is designed to scale with growing data volumes and can be extended with additional features as needed. All operations include comprehensive error handling, validation, and user-friendly interfaces.
