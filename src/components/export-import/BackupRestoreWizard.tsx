/**
 * Backup & Restore Wizard Component
 * Multi-step wizard for backup and restore operations
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Download, Upload, RefreshCw, Shield, Clock } from 'lucide-react';

interface BackupRestoreWizardProps {
  onClose?: () => void;
}

export function BackupRestoreWizard({ onClose }: BackupRestoreWizardProps) {
  const [backups, setBackups] = useState<any[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [includeImages, setIncludeImages] = useState(true);
  const [createBackupBeforeRestore, setCreateBackupBeforeRestore] = useState(true);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/backup/list');
      const data = await response.json();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          includeImages
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchBackups();
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    setIsRestoring(true);
    try {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          backupId: selectedBackup,
          createBackupBeforeRestore
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Restore completed successfully!');
      }
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>
          Create backups and restore your photo analysis data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="backup" className="space-y-4">
          <TabsList>
            <TabsTrigger value="backup" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Backup</span>
            </TabsTrigger>
            <TabsTrigger value="restore" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Restore</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="backup" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Create a full backup of your photo analysis data including images, analysis results, and settings.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create New Backup</CardTitle>
                <CardDescription>
                  Select backup options and create a new backup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeImages"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                  />
                  <label htmlFor="includeImages" className="text-sm font-medium">
                    Include images in backup (recommended)
                  </label>
                </div>

                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="w-full"
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Backup History</CardTitle>
                <CardDescription>
                  Your previous backups
                </CardDescription>
              </CardHeader>
              <CardContent>
                {backups.length > 0 ? (
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-primary/10 rounded">
                            <Database className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{backup.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(backup.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant="secondary">
                            {backup.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(backup.size)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No backups available</p>
                    <p className="text-sm">Create your first backup to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Warning: Restoring from a backup will replace your current data. Make sure to create a backup of your current state first.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Backups</CardTitle>
                <CardDescription>
                  Select a backup to restore from
                </CardDescription>
              </CardHeader>
              <CardContent>
                {backups.length > 0 ? (
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <div
                        key={backup.id}
                        className={cn(
                          'p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50',
                          selectedBackup === backup.id ? 'ring-2 ring-primary bg-muted' : ''
                        )}
                        onClick={() => setSelectedBackup(backup.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <input
                              type="radio"
                              checked={selectedBackup === backup.id}
                              onChange={() => setSelectedBackup(backup.id)}
                            />
                            <div className="p-2 bg-primary/10 rounded">
                              <Database className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{backup.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(backup.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">{backup.type}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatFileSize(backup.size)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No backups available</p>
                    <p className="text-sm">Create a backup first to enable restore</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedBackup && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Restore Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="createBackupBeforeRestore"
                      checked={createBackupBeforeRestore}
                      onChange={(e) => setCreateBackupBeforeRestore(e.target.checked)}
                    />
                    <label htmlFor="createBackupBeforeRestore" className="text-sm font-medium">
                      Create backup of current state before restore (recommended)
                    </label>
                  </div>

                  <Button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="w-full"
                    variant="destructive"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Restore from Selected Backup
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
