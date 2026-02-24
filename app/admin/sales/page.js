'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Upload,
  Download,
  Filter,
  CheckCircle,
  Book,
  Search,
  BarChart3,
  User,
  Settings,
  Plus,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const PLATFORMS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'EBOOK', label: 'Ebook' },
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'FLIPKART', label: 'Flipkart' },
  { value: 'ECOMMERCE', label: 'Other E-commerce' },
];

export default function AdminSalesPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState([]);
  const [royalties, setRoyalties] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoyalties, setSelectedRoyalties] = useState([]);

  // Filters
  const [platformFilter, setPlatformFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewBy, setViewBy] = useState('all'); // all, book, author

  // Royalty Config Dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [royaltyConfigs, setRoyaltyConfigs] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);

  // Import Dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, royaltiesRes, booksRes] = await Promise.all([
        fetch('/api/admin/sales'),
        fetch('/api/admin/royalties'),
        fetch('/api/admin/books'),
      ]);
      
      const salesData = await salesRes.json();
      const royaltiesData = await royaltiesRes.json();
      const booksData = await booksRes.json();
      
      setSales(salesData.sales || []);
      setRoyalties(royaltiesData.royalties || []);
      setBooks(booksData.books || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openRoyaltyConfig = async (book) => {
    setSelectedBook(book);
    try {
      const res = await fetch(`/api/admin/books/${book.id}/royalty-config`);
      const data = await res.json();
      setRoyaltyConfigs(data.configs || []);
    } catch (error) {
      setRoyaltyConfigs([]);
    }
    setConfigDialogOpen(true);
  };

  const saveRoyaltyConfig = async (platform, amount) => {
    if (!selectedBook) return;

    try {
      const res = await fetch(`/api/admin/books/${selectedBook.id}/royalty-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, royaltyAmount: parseFloat(amount) }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast({ title: 'Saved', description: `Royalty config for ${platform} saved` });
      
      // Refresh configs
      const configRes = await fetch(`/api/admin/books/${selectedBook.id}/royalty-config`);
      const data = await configRes.json();
      setRoyaltyConfigs(data.configs || []);
      setEditingConfig(null);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleMarkAsPaid = async () => {
    if (selectedRoyalties.length === 0) {
      toast({ title: 'Error', description: 'Select royalties to mark as paid', variant: 'destructive' });
      return;
    }

    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/admin/royalties/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          royaltyIds: selectedRoyalties,
          markedById: user?.id,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to mark as paid');
      
      toast({ title: 'Success', description: `${selectedRoyalties.length} royalties marked as paid. Authors notified.` });
      setSelectedRoyalties([]);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleExport = () => {
    // Generate CSV with all required fields including bank details
    const headers = [
      'ISBN', 'Book Title', 'Author Name', 'Author UID', 'Author Email',
      'Bank Account Number', 'IFSC Code', 'Account Holder Name', 'Bank Name',
      'Platform', 'Quantity', 'Royalty Amount', 'Status', 'Period', 'Paid Date'
    ];
    const rows = filteredRoyalties.map(r => {
      const bankDetails = r.author?.bankDetails;
      return [
        r.book?.isbn || r.book?.isbnPaperback || r.book?.isbnHardcover || '',
        r.book?.title || '',
        r.author?.name || '',
        r.authorUid || r.author?.authorUid || '',
        r.author?.email || '',
        bankDetails?.accountNumber || '',
        bankDetails?.ifscCode || '',
        bankDetails?.accountName || '',
        bankDetails?.bankName || '',
        r.platform || r.bucket || '',
        r.quantity || 1,
        r.amount,
        r.isPaid ? 'Paid' : 'Pending',
        r.period || '',
        r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '',
      ];
    });
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `royalties-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Get unique periods and platforms
  const periods = [...new Set(royalties.map(r => r.period).filter(Boolean))].sort().reverse();
  const uniquePlatforms = [...new Set(royalties.map(r => r.platform || r.bucket).filter(Boolean))];

  // Filter royalties
  const filteredRoyalties = royalties.filter(r => {
    if (platformFilter !== 'all' && (r.platform || r.bucket) !== platformFilter) return false;
    if (periodFilter !== 'all' && r.period !== periodFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !r.book?.title?.toLowerCase().includes(query) &&
        !r.author?.name?.toLowerCase().includes(query) &&
        !r.book?.isbn?.toLowerCase().includes(query)
      ) return false;
    }
    return true;
  });

  // Summary calculations
  const summary = {
    totalSales: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    totalUnits: sales.reduce((sum, s) => sum + s.quantity, 0),
    totalRoyalties: royalties.reduce((sum, r) => sum + r.amount, 0),
    pendingRoyalties: royalties.filter(r => !r.isPaid).reduce((sum, r) => sum + r.amount, 0),
    paidRoyalties: royalties.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0),
  };

  // Group by book for "By Book" view
  const royaltiesByBook = filteredRoyalties.reduce((acc, r) => {
    const bookId = r.bookId;
    if (!acc[bookId]) {
      acc[bookId] = {
        book: r.book,
        author: r.author,
        total: 0,
        pending: 0,
        paid: 0,
        items: [],
      };
    }
    acc[bookId].total += r.amount;
    if (r.isPaid) acc[bookId].paid += r.amount;
    else acc[bookId].pending += r.amount;
    acc[bookId].items.push(r);
    return acc;
  }, {});

  // Group by author for "By Author" view
  const royaltiesByAuthor = filteredRoyalties.reduce((acc, r) => {
    const authorId = r.authorId;
    if (!acc[authorId]) {
      acc[authorId] = {
        author: r.author,
        total: 0,
        pending: 0,
        paid: 0,
        items: [],
      };
    }
    acc[authorId].total += r.amount;
    if (r.isPaid) acc[authorId].paid += r.amount;
    else acc[authorId].pending += r.amount;
    acc[authorId].items.push(r);
    return acc;
  }, {});

  // Pending royalties
  const pendingRoyalties = royalties.filter(r => !r.isPaid);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales & Royalties</h1>
          <p className="text-muted-foreground mt-1">Track sales, configure royalties, and manage payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import Sales
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold">₹{summary.totalSales.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Royalties</p>
                <p className="text-xl font-bold">₹{summary.totalRoyalties.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Pending Payout</p>
                <p className="text-xl font-bold text-yellow-600">₹{summary.pendingRoyalties.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-xl font-bold text-green-600">₹{summary.paidRoyalties.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Book className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Units Sold</p>
                <p className="text-xl font-bold">{summary.totalUnits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="royalties">
        <TabsList>
          <TabsTrigger value="royalties">Royalties ({pendingRoyalties.length} pending)</TabsTrigger>
          <TabsTrigger value="sales">Sales Records</TabsTrigger>
          <TabsTrigger value="config">Royalty Configuration</TabsTrigger>
        </TabsList>

        {/* Royalties Tab */}
        <TabsContent value="royalties" className="space-y-4">
          {/* Filters & Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, author, ISBN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={viewBy} onValueChange={setViewBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="View by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="book">By Book</SelectItem>
                      <SelectItem value="author">By Author</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      {uniquePlatforms.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      {periods.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRoyalties.length > 0 && (
                  <Button onClick={handleMarkAsPaid}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark {selectedRoyalties.length} as Paid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Royalties View */}
          {viewBy === 'all' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRoyalties.length === pendingRoyalties.length && pendingRoyalties.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRoyalties(pendingRoyalties.map(r => r.id));
                            } else {
                              setSelectedRoyalties([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>ISBN</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Royalty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoyalties.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No royalty records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoyalties.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {!r.isPaid && (
                              <Checkbox
                                checked={selectedRoyalties.includes(r.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRoyalties([...selectedRoyalties, r.id]);
                                  } else {
                                    setSelectedRoyalties(selectedRoyalties.filter(id => id !== r.id));
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{r.period || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.book?.isbn || r.book?.isbnPaperback || '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{r.book?.title}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{r.author?.name}</p>
                              <p className="text-xs text-muted-foreground">{r.authorUid || r.author?.authorUid}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.platform || r.bucket}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{r.quantity || 1}</TableCell>
                          <TableCell className="text-right font-medium">₹{r.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={r.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {r.isPaid ? 'Paid' : 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {viewBy === 'book' && (
            <div className="space-y-4">
              {Object.entries(royaltiesByBook).map(([bookId, data]) => (
                <Card key={bookId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{data.book?.title}</CardTitle>
                        <CardDescription>
                          ISBN: {data.book?.isbn || data.book?.isbnPaperback || 'N/A'} • {data.author?.name}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">₹{data.total.toLocaleString()}</p>
                        <p className="text-xs">
                          <span className="text-green-600">₹{data.paid.toLocaleString()} paid</span>
                          {' • '}
                          <span className="text-yellow-600">₹{data.pending.toLocaleString()} pending</span>
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {viewBy === 'author' && (
            <div className="space-y-4">
              {Object.entries(royaltiesByAuthor).map(([authorId, data]) => (
                <Card key={authorId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{data.author?.name}</CardTitle>
                        <CardDescription>
                          UID: {data.author?.authorUid || 'N/A'} • {data.items.length} transactions
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">₹{data.total.toLocaleString()}</p>
                        <p className="text-xs">
                          <span className="text-green-600">₹{data.paid.toLocaleString()} paid</span>
                          {' • '}
                          <span className="text-yellow-600">₹{data.pending.toLocaleString()} pending</span>
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>ISBN</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No sales records. Import sales data to see records here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.slice(0, 50).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{sale.isbnUsed || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{sale.book?.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.platform}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{sale.quantity}</TableCell>
                        <TableCell className="text-right font-medium">₹{sale.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Royalty Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Royalty Configuration per Book</CardTitle>
              <CardDescription>
                Define fixed royalty AMOUNT per unit sold for each platform. Click on a book to configure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {books.filter(b => b.status === 'PUBLISHED' || b.isbn || b.isbnPaperback).slice(0, 20).map((book) => (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openRoyaltyConfig(book)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-sm text-muted-foreground">
                            ISBN: {book.isbn || book.isbnPaperback || book.isbnHardcover || 'Not assigned'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Configure</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {books.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No books available for configuration
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Royalty Config Dialog */}
      <Sheet open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedBook && (
            <>
              <SheetHeader>
                <SheetTitle>Royalty Configuration</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-medium">{selectedBook.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    ISBN: {selectedBook.isbn || selectedBook.isbnPaperback || 'Not assigned'}
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Amount-Based Model:</strong> Define a fixed royalty amount per unit sold for each platform.
                  </p>
                </div>

                {/* Existing Configs */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Platform Royalties</h4>
                  
                  {PLATFORMS.map((platform) => {
                    const existingConfig = royaltyConfigs.find(c => c.platform === platform.value);
                    const isEditing = editingConfig === platform.value;
                    
                    return (
                      <div key={platform.value} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{platform.label}</Badge>
                        </div>
                        
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">₹</span>
                            <Input
                              type="number"
                              defaultValue={existingConfig?.royaltyAmount || ''}
                              className="w-24"
                              id={`config-${platform.value}`}
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">/unit</span>
                            <Button
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(`config-${platform.value}`);
                                saveRoyaltyConfig(platform.value, input.value);
                              }}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingConfig(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {existingConfig ? (
                              <span className="font-medium">₹{existingConfig.royaltyAmount}/unit</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingConfig(platform.value)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-700 mb-1">How it works:</p>
                  <ul className="text-blue-600 space-y-1">
                    <li>• When sales are imported, royalties are calculated using these amounts</li>
                    <li>• Example: 5 units sold on Amazon × ₹42/unit = ₹210 royalty</li>
                    <li>• Different platforms can have different royalty amounts</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Sales Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with sales data. Royalties will be auto-calculated based on configured amounts.
            </p>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Drag and drop a CSV file, or click to browse</p>
              <Input type="file" accept=".csv" className="max-w-xs mx-auto" />
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Required columns:</p>
              <code className="text-xs">ISBN, Platform, Date, Quantity, SaleAmount</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button>Process Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
