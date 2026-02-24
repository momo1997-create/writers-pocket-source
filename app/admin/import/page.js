'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  Book,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  History,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const IMPORT_TYPES = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'Import authors and team members',
    fields: ['Name*', 'Email*', 'Phone', 'Role'],
    sample: 'name,email,phone,role\nJohn Doe,john@example.com,9876543210,AUTHOR',
  },
  {
    id: 'books',
    label: 'Books',
    icon: Book,
    description: 'Import book catalog with ISBN',
    fields: ['Title*', 'Author UID/Email*', 'Paperback ISBN', 'Hardcover ISBN', 'Category', 'Description'],
    sample: 'title,author_email,isbn_paperback,isbn_hardcover,category,description\nMy Book,author@example.com,9781234567890,9781234567891,Fiction,A great book',
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    description: 'Import sales data for royalty calculation',
    fields: ['ISBN*', 'Platform*', 'Date*', 'Quantity*', 'Amount*'],
    sample: 'isbn,platform,date,quantity,amount\n9781234567890,Amazon,2024-01-15,5,1250',
  },
];

export default function AdminImportPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [validationResult, setValidationResult] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      const res = await fetch('/api/admin/imports');
      const data = await res.json();
      setImportHistory(data.imports || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || '';
        });
        return row;
      });
      setCsvData({ headers, rows });
      
      // Auto-map fields based on header names
      const typeConfig = IMPORT_TYPES.find(t => t.id === selectedType);
      if (typeConfig) {
        const mapping = {};
        typeConfig.fields.forEach(field => {
          const fieldName = field.replace('*', '').toLowerCase();
          const matchedHeader = headers.find(h => 
            h.toLowerCase().includes(fieldName) || 
            fieldName.includes(h.toLowerCase())
          );
          if (matchedHeader) {
            mapping[field] = matchedHeader;
          }
        });
        setFieldMapping(mapping);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleValidate = async () => {
    if (!csvData || !selectedType) return;

    try {
      const res = await fetch('/api/admin/imports/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: csvData.rows,
          mapping: fieldMapping,
        }),
      });
      const result = await res.json();
      setValidationResult(result);
      setPreviewDialogOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Validation failed', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.errors?.length > 0) {
      toast({ title: 'Error', description: 'Please fix validation errors first', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const res = await fetch('/api/admin/imports/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: csvData.rows,
          mapping: fieldMapping,
        }),
      });

      if (!res.ok) throw new Error('Import failed');

      const result = await res.json();
      
      setImportProgress(100);
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.successCount} records. ${result.errorCount} errors.`,
      });

      // Reset state
      setFile(null);
      setCsvData(null);
      setFieldMapping({});
      setValidationResult(null);
      setPreviewDialogOpen(false);
      fetchImportHistory();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = (type) => {
    const config = IMPORT_TYPES.find(t => t.id === type);
    if (!config) return;
    
    const blob = new Blob([config.sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-sample.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Bulk Import</h1>
          <p className="text-muted-foreground mt-1">Import users, books, and sales data</p>
        </div>
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> New Import
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Import History
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* Step 1: Select Import Type */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Import Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {IMPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedType === type.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedType(type.id);
                        setFile(null);
                        setCsvData(null);
                        setFieldMapping({});
                        setValidationResult(null);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${selectedType === type.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="font-medium">{type.label}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 p-0 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSampleCSV(type.id);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" /> Sample CSV
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Upload File */}
          {selectedType && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Upload CSV File</CardTitle>
                <CardDescription>
                  Required fields: {IMPORT_TYPES.find(t => t.id === selectedType)?.fields.filter(f => f.includes('*')).join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {file ? (
                    <div>
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-green-600" />
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {csvData?.rows?.length || 0} rows detected
                      </p>
                      <Button variant="outline" onClick={() => {
                        setFile(null);
                        setCsvData(null);
                        setFieldMapping({});
                        setValidationResult(null);
                      }}>
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop a CSV file, or click to browse
                      </p>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Field Mapping */}
          {csvData && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Map Fields</CardTitle>
                <CardDescription>
                  Match your CSV columns to the required fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {IMPORT_TYPES.find(t => t.id === selectedType)?.fields.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label>
                        {field}
                        {field.includes('*') && <span className="text-red-500 ml-1">Required</span>}
                      </Label>
                      <Select
                        value={fieldMapping[field] || ''}
                        onValueChange={(v) => setFieldMapping({ ...fieldMapping, [field]: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Skip --</SelectItem>
                          {csvData.headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={handleValidate}>
                    <Eye className="mr-2 h-4 w-4" /> Preview & Validate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Progress */}
          {importing && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Importing...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>Previous import batches and their results</CardDescription>
            </CardHeader>
            <CardContent>
              {importHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No import history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Total Rows</TableHead>
                      <TableHead>Success</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>{new Date(batch.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{batch.fileName}</TableCell>
                        <TableCell>{batch.totalRows}</TableCell>
                        <TableCell className="text-green-600">{batch.successCount}</TableCell>
                        <TableCell className="text-red-600">{batch.errorCount}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              batch.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : batch.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }
                          >
                            {batch.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview & Validation Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview & Validation Results</DialogTitle>
          </DialogHeader>
          
          {validationResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{validationResult.validCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Valid Rows</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{validationResult.errors?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{validationResult.warnings?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Warnings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {validationResult.errors?.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" /> Errors (Must Fix)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {validationResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i} className="text-red-600">Row {err.row}: {err.message}</li>
                      ))}
                      {validationResult.errors.length > 10 && (
                        <li className="text-muted-foreground">...and {validationResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Preview Data */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Data Preview (First 5 rows)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(fieldMapping).filter(k => fieldMapping[k]).map(k => (
                          <TableHead key={k}>{k.replace('*', '')}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData?.rows.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.keys(fieldMapping).filter(k => fieldMapping[k]).map(k => (
                            <TableCell key={k}>{row[fieldMapping[k]] || '-'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || (validationResult?.errors?.length > 0)}
            >
              {importing ? 'Importing...' : 'Confirm Import'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
