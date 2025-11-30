/**
 * Import Wizard Component
 * Multi-step wizard for importing data
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportWizardProps {
  onClose?: () => void;
  onImportComplete?: (result: any) => void;
}

export function ImportWizard({ onClose, onImportComplete }: ImportWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [validation, setValidation] = useState<any>(null);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace' | 'skip-duplicates'>('merge');
  const [conflictResolution, setConflictResolution] = useState<'keep-existing' | 'overwrite' | 'create-copy'>('keep-existing');
  const [skipErrors, setSkipErrors] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const totalSteps = 4;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setFileId(data.importId);
        setStep(2);
      } else {
        console.error('Upload failed:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleValidate = async () => {
    if (!fileId) return;

    setIsValidating(true);
    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId,
          options: {
            mergeMode,
            skipErrors,
            conflictResolution
          }
        })
      });

      const data = await response.json();
      setValidation(data);
      if (data.valid) {
        setStep(3);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!fileId) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId,
          options: {
            mergeMode,
            skipErrors,
            conflictResolution
          }
        })
      });

      const data = await response.json();
      setImportResult(data);
      setStep(4);
      onImportComplete?.(data);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Upload Import File</h3>
              <Card className="border-dashed">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium">
                          Click to select a file
                        </span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".json,.csv,.xml,.xlsx,.zip"
                          onChange={handleFileChange}
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: JSON, CSV, XML, XLSX, ZIP
                      </p>
                    </div>
                    {file && (
                      <div className="mt-4 p-4 bg-muted rounded-lg w-full">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Import Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label>Merge Mode</Label>
                  <Select value={mergeMode} onValueChange={(value: any) => setMergeMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select merge mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merge">Merge (combine with existing)</SelectItem>
                      <SelectItem value="replace">Replace (overwrite existing)</SelectItem>
                      <SelectItem value="skip-duplicates">Skip Duplicates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Conflict Resolution</Label>
                  <Select
                    value={conflictResolution}
                    onValueChange={(value: any) => setConflictResolution(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select conflict resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep-existing">Keep Existing</SelectItem>
                      <SelectItem value="overwrite">Overwrite</SelectItem>
                      <SelectItem value="create-copy">Create Copy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="skipErrors"
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                  />
                  <Label htmlFor="skipErrors">Skip errors and continue import</Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Validate & Review</h3>
              {validation ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {validation.valid ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {validation.valid ? 'Validation Passed' : 'Validation Issues Found'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {validation.summary?.message || 'Ready to import'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {validation.errors && validation.errors.length > 0 && (
                    <Card className="border-destructive">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-destructive mb-2">Errors</h4>
                        <ul className="space-y-1">
                          {validation.errors.map((error: string, index: number) => (
                            <li key={index} className="text-sm flex items-center space-x-2">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {validation.warnings && validation.warnings.length > 0 && (
                    <Card className="border-yellow-500">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
                        <ul className="space-y-1">
                          {validation.warnings.map((warning: string, index: number) => (
                            <li key={index} className="text-sm flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{validation.recordCount}</div>
                        <div className="text-sm text-muted-foreground">Records</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{mergeMode}</div>
                        <div className="text-sm text-muted-foreground">Mode</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{conflictResolution}</div>
                        <div className="text-sm text-muted-foreground">Resolution</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Click Validate to check the file</p>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Import Complete</h3>
              {importResult ? (
                <div className="space-y-4">
                  <Card className="border-green-500">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">Import Successful</h4>
                          <p className="text-muted-foreground">{importResult.summary?.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{importResult.imported}</div>
                        <div className="text-sm text-muted-foreground">Imported</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-yellow-600">{importResult.skipped}</div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-red-600">{importResult.errors}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No import results available</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Import Photo Analysis Data</CardTitle>
        <CardDescription>
          Import photo analysis data from external sources
        </CardDescription>
        <Progress value={(step / totalSteps) * 100} className="mt-4" />
        <div className="flex justify-between mt-2">
          <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
          {file && (
            <Badge variant="secondary">
              {file.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStepContent()}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            disabled={isUploading || isValidating || isImporting}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step === 1 && file && (
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleValidate} disabled={isValidating}>
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          )}
          {step === 3 && validation?.valid && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Start Import'}
            </Button>
          )}
          {step === 4 && (
            <Button onClick={onClose}>Close</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
