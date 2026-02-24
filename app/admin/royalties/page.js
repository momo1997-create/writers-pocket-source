'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Book,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AdminRoyaltiesPage() {
  const { toast } = useToast();
  const [royalties, setRoyalties] = useState([]);
  const [royaltiesByAuthor, setRoyaltiesByAuthor] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});
  const [selectedRoyalties, setSelectedRoyalties] = useState([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  // Filters
  const [authorUidFilter, setAuthorUidFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [bucketFilter, setBucketFilter] = useState('all');

  useEffect(() => {
    fetchRoyalties();
    fetchPeriods();
    fetchByAuthor();
  }, [periodFilter, paidFilter, bucketFilter]);

  const fetchRoyalties = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (authorUidFilter) params.append('authorUid', authorUidFilter);
      if (periodFilter !== 'all') params.append('period', periodFilter);
      if (paidFilter !== 'all') params.append('isPaid', paidFilter);
      if (bucketFilter !== 'all') params.append('bucket', bucketFilter);

      const res = await fetch(`/api/admin/royalties?${params}`);
      const data = await res.json();
      setRoyalties(data.royalties || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || {});
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load royalties', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/admin/royalties/periods');
      const data = await res.json();
      setPeriods(data.periods || []);
    } catch (error) {
      console.error('Failed to load periods:', error);
    }
  };

  const fetchByAuthor = async () => {
    try {
      const params = new URLSearchParams();
      if (periodFilter !== 'all') params.append('period', periodFilter);

      const res = await fetch(`/api/admin/royalties/by-author?${params}`);
      const data = await res.json();
      setRoyaltiesByAuthor(data.royaltiesByAuthor || []);
    } catch (error) {
      console.error('Failed to load royalties by author:', error);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedRoyalties.length === 0) {
      toast({ title: 'Error', description: 'No royalties selected', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/admin/royalties/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ royaltyIds: selectedRoyalties, paymentRef }),
      });

      if (!res.ok) throw new Error('Failed to mark as paid');

      toast({ title: 'Success', description: `${selectedRoyalties.length} royalties marked as paid` });
      setPayDialogOpen(false);
      setSelectedRoyalties([]);
      setPaymentRef('');
      fetchRoyalties();
      fetchByAuthor();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRoyalties(royalties.filter(r => !r.isPaid).map(r => r.id));
    } else {
      setSelectedRoyalties([]);
    }
  };

  const handleSelectRoyalty = (royaltyId, checked) => {
    if (checked) {
      setSelectedRoyalties([...selectedRoyalties, royaltyId]);
    } else {
      setSelectedRoyalties(selectedRoyalties.filter(id => id !== royaltyId));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Author UID', 'Author Name', 'Book Title', 'ISBN', 'Period', 'Bucket', 'Platform', 'Sale Amount', 'Royalty Amount', 'Status'];
    const rows = royalties.map(r => [
      r.authorUid,
      r.author?.name,
      r.book?.title,
      r.book?.paperbackIsbn || r.book?.canonicalIsbn || '',
      r.period,
      r.bucket,
      r.platform,
      r.saleAmount,
      r.amount,
      r.isPaid ? 'Paid' : 'Pending',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `royalties-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'CSV file downloaded' });
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const getBucketBadge = (bucket) => {
    const styles = {
      WEBSITE: 'bg-blue-100 text-blue-800',
      EBOOK: 'bg-purple-100 text-purple-800',
      ECOMMERCE: 'bg-green-100 text-green-800',
    };
    return <Badge className={styles[bucket] || 'bg-gray-100'}>{bucket}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading royalties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Royalties Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage author royalties</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {selectedRoyalties.length > 0 && (
            <Button onClick={() => setPayDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid ({selectedRoyalties.length})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Sales
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Royalties
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle className="h-4 w-4" />
              Paid
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.paidAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-1">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(summary.pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Filter by Author UID..."
            value={authorUidFilter}
            onChange={(e) => setAuthorUidFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRoyalties()}
          />
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p.period} value={p.period}>{p.period}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bucketFilter} onValueChange={setBucketFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Buckets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buckets</SelectItem>
            <SelectItem value="WEBSITE">Website</SelectItem>
            <SelectItem value="EBOOK">Ebook</SelectItem>
            <SelectItem value="ECOMMERCE">Ecommerce</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paidFilter} onValueChange={setPaidFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Paid</SelectItem>
            <SelectItem value="false">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchRoyalties()}>
          <Filter className="mr-2 h-4 w-4" /> Apply
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Royalties</TabsTrigger>
          <TabsTrigger value="by-author">By Author</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Royalty Records ({pagination.total || royalties.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {royalties.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No royalties found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-4 w-10">
                          <Checkbox
                            checked={selectedRoyalties.length === royalties.filter(r => !r.isPaid).length && royalties.filter(r => !r.isPaid).length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left p-4 font-medium">Author</th>
                        <th className="text-left p-4 font-medium">Book</th>
                        <th className="text-left p-4 font-medium">Period</th>
                        <th className="text-left p-4 font-medium">Bucket</th>
                        <th className="text-left p-4 font-medium">Platform</th>
                        <th className="text-right p-4 font-medium">Sale</th>
                        <th className="text-right p-4 font-medium">Royalty</th>
                        <th className="text-left p-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {royalties.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="p-4">
                            {!r.isPaid && (
                              <Checkbox
                                checked={selectedRoyalties.includes(r.id)}
                                onCheckedChange={(c) => handleSelectRoyalty(r.id, c)}
                              />
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{r.author?.name}</div>
                            <code className="text-xs text-muted-foreground">{r.authorUid}</code>
                          </td>
                          <td className="p-4">
                            <div className="max-w-[200px] truncate">{r.book?.title}</div>
                            <div className="text-xs text-muted-foreground">{r.book?.isbnPaperback}</div>
                          </td>
                          <td className="p-4">{r.period}</td>
                          <td className="p-4">{getBucketBadge(r.bucket)}</td>
                          <td className="p-4 text-sm">{r.platform || '-'}</td>
                          <td className="p-4 text-right">{formatCurrency(r.saleAmount)}</td>
                          <td className="p-4 text-right font-medium">{formatCurrency(r.amount)}</td>
                          <td className="p-4">
                            {r.isPaid ? (
                              <Badge className="bg-green-100 text-green-800">Paid</Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-author">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Royalties by Author
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {royaltiesByAuthor.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Author</th>
                        <th className="text-left p-4 font-medium">Author UID</th>
                        <th className="text-right p-4 font-medium">Total Sales</th>
                        <th className="text-right p-4 font-medium">Total Royalty</th>
                        <th className="text-right p-4 font-medium">Entries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {royaltiesByAuthor.map((r, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-4 font-medium">{r.author?.name || 'Unknown'}</td>
                          <td className="p-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{r.author?.authorUid || '-'}</code>
                          </td>
                          <td className="p-4 text-right">{formatCurrency(r.totalSales)}</td>
                          <td className="p-4 text-right font-medium">{formatCurrency(r.totalAmount)}</td>
                          <td className="p-4 text-right">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mark Paid Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Royalties as Paid</DialogTitle>
            <DialogDescription>
              {selectedRoyalties.length} royalties selected
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Reference (optional)</Label>
              <Input
                placeholder="e.g., Transaction ID, Cheque No."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                This will mark {selectedRoyalties.length} royalty entries as paid with today's date.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid}>
              <CheckCircle className="mr-2 h-4 w-4" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
