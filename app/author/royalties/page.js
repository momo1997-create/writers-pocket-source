'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Book,
  Download,
  Globe,
  Tablet,
  ShoppingBag,
  Info,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AuthorRoyaltiesPage() {
  const { toast } = useToast();
  const [royalties, setRoyalties] = useState([]);
  const [summary, setSummary] = useState(null);
  const [byPeriod, setByPeriod] = useState({});
  const [byDay, setByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedBook, setSelectedBook] = useState('all');
  const [books, setBooks] = useState([]);
  const [expandedPeriods, setExpandedPeriods] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const [royaltiesRes, booksRes] = await Promise.all([
        fetch('/api/author/royalties', {
          headers: { 'x-user-id': user?.id || '' },
        }),
        fetch('/api/author/books', {
          headers: { 'x-user-id': user?.id || '' },
        }),
      ]);
      const royaltiesData = await royaltiesRes.json();
      const booksData = await booksRes.json();
      setRoyalties(royaltiesData.royalties || []);
      setSummary(royaltiesData.summary || null);
      setByPeriod(royaltiesData.byPeriod || {});
      setByDay(royaltiesData.byDay || {});
      setBooks(booksData.books || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getBucketIcon = (bucket) => {
    switch (bucket) {
      case 'WEBSITE': return <Globe className="h-4 w-4" />;
      case 'EBOOK': return <Tablet className="h-4 w-4" />;
      case 'ECOMMERCE': return <ShoppingBag className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getBucketLabel = (bucket) => {
    switch (bucket) {
      case 'WEBSITE': return 'Website Sales';
      case 'EBOOK': return 'Ebook Sales';
      case 'ECOMMERCE': return 'E-commerce';
      default: return bucket;
    }
  };

  const getPlatformLabel = (platform) => {
    const labels = {
      WEBSITE: 'Website',
      EBOOK: 'Ebook',
      AMAZON: 'Amazon',
      FLIPKART: 'Flipkart',
      ECOMMERCE: 'E-commerce',
    };
    return labels[platform] || platform;
  };

  const togglePeriod = (period) => {
    setExpandedPeriods(prev => ({ ...prev, [period]: !prev[period] }));
  };

  // Get unique periods
  const periods = Object.keys(byPeriod).sort().reverse();

  // Filter royalties
  const filteredRoyalties = royalties.filter(r => {
    if (selectedPeriod !== 'all' && r.period !== selectedPeriod) return false;
    if (selectedBook !== 'all' && r.bookId !== selectedBook) return false;
    return true;
  });

  // Calculate filtered summary
  const filteredSummary = {
    total: filteredRoyalties.reduce((sum, r) => sum + r.amount, 0),
    paid: filteredRoyalties.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0),
    pending: filteredRoyalties.filter(r => !r.isPaid).reduce((sum, r) => sum + r.amount, 0),
    byBucket: {
      WEBSITE: filteredRoyalties.filter(r => r.bucket === 'WEBSITE').reduce((sum, r) => sum + r.amount, 0),
      EBOOK: filteredRoyalties.filter(r => r.bucket === 'EBOOK').reduce((sum, r) => sum + r.amount, 0),
      ECOMMERCE: filteredRoyalties.filter(r => r.bucket === 'ECOMMERCE').reduce((sum, r) => sum + r.amount, 0),
    },
  };

  // Sort days for daily view
  const sortedDays = Object.keys(byDay).sort().reverse();

  const handleExport = () => {
    const headers = ['Period', 'Book', 'Platform', 'Quantity', 'Royalty Amount', 'Status'];
    const rows = filteredRoyalties.map(r => [
      r.period || '-',
      r.book?.title || '',
      r.platform || r.bucket || '',
      r.quantity || 1,
      r.amount,
      r.isPaid ? 'Paid' : 'Pending',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => `"${r.join('","')}"`).join('\n')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-royalties-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Royalties</h1>
          <p className="text-muted-foreground mt-1">Track your book earnings</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">₹{filteredSummary.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-xl font-bold text-blue-600">₹{filteredSummary.paid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-yellow-600">₹{filteredSummary.pending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Book className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Books</p>
                <p className="text-xl font-bold">{books.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Platform */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Website Sales</span>
              </div>
              <span className="text-lg font-bold">₹{filteredSummary.byBucket.WEBSITE.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tablet className="h-5 w-5 text-green-600" />
                <span className="font-medium">Ebook Sales</span>
              </div>
              <span className="text-lg font-bold">₹{filteredSummary.byBucket.EBOOK.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
                <span className="font-medium">E-commerce</span>
              </div>
              <span className="text-lg font-bold">₹{filteredSummary.byBucket.ECOMMERCE.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
        </TabsList>

        {/* Monthly Breakdown */}
        <TabsContent value="monthly" className="space-y-4">
          {periods.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No royalty records yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {periods.map(period => {
                const data = byPeriod[period];
                const isExpanded = expandedPeriods[period];
                return (
                  <Card key={period}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => togglePeriod(period)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          <div className="text-left">
                            <p className="font-medium text-lg">{period}</p>
                            <p className="text-sm text-muted-foreground">{data?.items?.length || 0} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">₹{(data?.total || 0).toLocaleString()}</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-600">₹{(data?.paid || 0).toLocaleString()} paid</span>
                            <span className="text-yellow-600">₹{(data?.pending || 0).toLocaleString()} pending</span>
                          </div>
                        </div>
                      </button>
                      
                      {isExpanded && data?.items && (
                        <div className="border-t px-4 pb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Book</TableHead>
                                <TableHead>Platform</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.items.map(r => (
                                <TableRow key={r.id}>
                                  <TableCell className="max-w-[200px] truncate">{r.book?.title}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getBucketIcon(r.bucket)}
                                      <span>{getPlatformLabel(r.platform || r.bucket)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{r.quantity || 1}</TableCell>
                                  <TableCell className="text-right font-medium">₹{r.amount.toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Badge className={r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                      {r.isPaid ? 'Paid' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Daily View */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown (Last 30 Days)</CardTitle>
              <CardDescription>Your royalty earnings day by day</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedDays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent royalty activity</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedDays.map(day => {
                    const data = byDay[day];
                    return (
                      <div key={day} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          <p className="text-sm text-muted-foreground">{data?.items?.length || 0} transaction(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">₹{(data?.total || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Transactions */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      {periods.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Book className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Book" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Books</SelectItem>
                      {books.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Royalties Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>Complete history of your royalty payments</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRoyalties.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No royalties found for the selected filters</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Royalty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoyalties.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.period || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.book?.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getBucketIcon(r.bucket)}
                            <span>{getPlatformLabel(r.platform || r.bucket)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{r.quantity || 1}</TableCell>
                        <TableCell className="text-right font-medium">₹{r.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {r.isPaid ? 'Paid' : 'Pending'}
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

      {/* How Royalties Work */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" /> How Royalties are Calculated
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4" /> Website Sales
              </h4>
              <p className="text-sm text-muted-foreground">
                Direct sales from our website. Fixed royalty amount per unit sold.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Tablet className="h-4 w-4" /> Ebook Sales
              </h4>
              <p className="text-sm text-muted-foreground">
                Digital book sales through various platforms like Kindle, Google Play, etc.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4" /> E-commerce
              </h4>
              <p className="text-sm text-muted-foreground">
                Sales through Amazon, Flipkart, and other e-commerce platforms.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Amount-Based Model:</strong> Your royalty is calculated as a fixed amount per unit sold, 
              configured separately for each platform. When we mark your royalty as paid, you'll receive 
              an in-app notification with the payment details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
