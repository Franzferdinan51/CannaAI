/**
 * Export Wizard Component
 * Multi-step wizard for creating exports
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Download, FileText, FileSpreadsheet, FileImage, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportWizardProps {
  onClose?: () => void;
  onExportComplete?: (jobId: string) => void;
}

export function ExportWizard({ onClose, onExportComplete }: ExportWizardProps) {
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf' | 'zip' | 'xml' | 'xlsx'>('json');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [includeImages, setIncludeImages] = useState(false);
  const [imageQuality, setImageQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<string[]>(['plants', 'strains']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  const totalSteps = 3;

  const formatOptions = [
    { value: 'json', label: 'JSON', icon: FileText, description: 'Full structured data with all metadata' },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Spreadsheet-compatible format' },
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Formatted reports with charts' },
    { value: 'zip', label: 'ZIP', icon: Archive, description: 'Complete backup with images' },
    { value: 'xml', label: 'XML', icon: FileText, description: 'Alternative structured format' },
    { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, description: 'Business-friendly format' }
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format,
          filters: {
            dateRange: dateRange.start && dateRange.end ? {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString()
            } : undefined,
            plantIds: selectedPlants.length > 0 ? selectedPlants : undefined,
            strainIds: selectedStrains.length > 0 ? selectedStrains : undefined,
            includeImages,
            imageQuality,
            compressImages: true
          },
          includeMetadata,
          customFields
        })
      });

      const data = await response.json();
      if (data.success) {
        setExportJobId(data.jobId);
        onExportComplete?.(data.jobId);
      } else {
        console.error('Export failed:', data.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Export Format</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formatOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.value}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        format === option.value ? 'ring-2 ring-primary' : ''
                      )}
                      onClick={() => setFormat(option.value as any)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <Icon className="h-8 w-8" />
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={includeImages}
                  onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
                />
                <Label htmlFor="includeImages">Include Images</Label>
              </div>

              {includeImages && (
                <div className="ml-6">
                  <Label htmlFor="imageQuality">Image Quality</Label>
                  <Select value={imageQuality} onValueChange={(value: any) => setImageQuality(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (90% quality)</SelectItem>
                      <SelectItem value="medium">Medium (70% quality)</SelectItem>
                      <SelectItem value="low">Low (50% quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="includeMetadata">Include Metadata</Label>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Filter Data</h3>

              <div className="space-y-4">
                <div>
                  <Label>Date Range (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'justify-start text-left font-normal',
                            !dateRange.start && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.start ? format(dateRange.start, 'PPP') : 'Start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.start}
                          onSelect={(date) => setDateRange({ ...dateRange, start: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'justify-start text-left font-normal',
                            !dateRange.end && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.end ? format(dateRange.end, 'PPP') : 'End date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.end}
                          onSelect={(date) => setDateRange({ ...dateRange, end: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label>Custom Fields to Include</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['plants', 'strains', 'rooms', 'sensors', 'automationRules', 'notifications'].map((field) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={customFields.includes(field)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCustomFields([...customFields, field]);
                            } else {
                              setCustomFields(customFields.filter(f => f !== field));
                            }
                          }}
                        />
                        <Label htmlFor={field} className="capitalize">{field}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review & Export</h3>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <Badge variant="secondary">{format.toUpperCase()}</Badge>
                  </div>
                  {dateRange.start && dateRange.end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date Range:</span>
                      <span>{format(dateRange.start, 'PPP')} - {format(dateRange.end, 'PPP')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Include Images:</span>
                    <Badge variant={includeImages ? 'default' : 'outline'}>
                      {includeImages ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {includeImages && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Image Quality:</span>
                      <span>{imageQuality}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Include Metadata:</span>
                    <Badge variant={includeMetadata ? 'default' : 'outline'}>
                      {includeMetadata ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custom Fields:</span>
                    <span>{customFields.join(', ')}</span>
                  </div>
                </CardContent>
              </Card>
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
        <CardTitle>Export Photo Analysis Data</CardTitle>
        <CardDescription>
          Export your photo analysis data in multiple formats
        </CardDescription>
        <Progress value={(step / totalSteps) * 100} className="mt-4" />
        <div className="flex justify-between mt-2">
          <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
          {exportJobId && (
            <Badge variant="success">Export Created: {exportJobId.substring(0, 8)}...</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStepContent()}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isExporting}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < totalSteps ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Download className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Start Export
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
