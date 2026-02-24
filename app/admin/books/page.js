'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  MoreVertical,
  UserCircle,
  Plus,
  Upload,
  Edit2,
  Book,
  Hash,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function AdminBooksPage() {
  const { toast } = useToast();
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editIsbnDialogOpen, setEditIsbnDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [csvData, setCsvData] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    authorId: '',
    category: '',
    description: '',
  });
  const [isbnData, setIsbnData] = useState({
    paperbackIsbn: '',
    hardcoverIsbn: '',
    ebookIsbn: '',
  });

  useEffect(() => {
    fetchBooks();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchQuery, statusFilter]);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/admin/books');
      const data = await res.json();
      setBooks(data.books || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load books', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?role=AUTHOR');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filterBooks = () => {
    let filtered = [...books];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title?.toLowerCase().includes(query) ||
          book.author?.name?.toLowerCase().includes(query) ||
          book.author?.email?.toLowerCase().includes(query) ||
          book.author?.authorUid?.toLowerCase().includes(query) ||
          book.isbnPaperback?.toLowerCase().includes(query) ||
          book.isbnHardcover?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((book) => book.status === statusFilter);
    }

    setFilteredBooks(filtered);
  };

  const handleCreateBook = async () => {
    if (!formData.title || !formData.authorId) {
      toast({ title: 'Error', description: 'Title and Author are required', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create book');
      }

      toast({ title: 'Success', description: 'Book created successfully' });
      setAddDialogOpen(false);
      resetForm();
      fetchBooks();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateIsbn = async () => {
    if (!selectedBook) return;

    try {
      const res = await fetch(`/api/admin/books/${selectedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbnPaperback: isbnData.paperbackIsbn || null,
          isbnHardcover: isbnData.hardcoverIsbn || null,
          isbnEbook: isbnData.ebookIsbn || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update ISBN');

      toast({ title: 'Success', description: 'ISBN updated successfully' });
      setEditIsbnDialogOpen(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleImportCSV = async () => {
    if (!csvData.trim()) {
      toast({ title: 'Error', description: 'Please paste CSV data', variant: 'destructive' });
      return;
    }

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const booksToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const book = {};
        headers.forEach((h, idx) => {
          if (h.includes('title')) book.title = values[idx];
          else if (h.includes('author') && h.includes('uid')) book.authorUid = values[idx];
          else if (h.includes('author') && h.includes('email')) book.authorEmail = values[idx];
          else if (h.includes('paperback') && h.includes('isbn')) book.isbnPaperback = values[idx];
          else if (h.includes('hardcover') && h.includes('isbn')) book.isbnHardcover = values[idx];
          else if (h.includes('category')) book.category = values[idx];
        });
        if (book.title && (book.authorUid || book.authorEmail)) {
          booksToImport.push(book);
        }
      }

      if (booksToImport.length === 0) {
        toast({ title: 'Error', description: 'No valid books found in CSV', variant: 'destructive' });
        return;
      }

      const res = await fetch('/api/admin/books/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: booksToImport }),
      });

      const data = await res.json();
      toast({
        title: 'Import Complete',
        description: `Success: ${data.results?.success?.length || 0}, Errors: ${data.results?.errors?.length || 0}`,
      });
      setImportDialogOpen(false);
      setCsvData('');
      fetchBooks();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEditIsbn = (book) => {
    setSelectedBook(book);
    setIsbnData({
      paperbackIsbn: book.isbnPaperback || '',
      hardcoverIsbn: book.isbnHardcover || '',
      ebookIsbn: book.isbnEbook || '',
    });
    setEditIsbnDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      authorId: '',
      category: '',
      description: '',
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
      UNDER_REVIEW: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-700' },
      FORMATTING: { label: 'Formatting', className: 'bg-purple-100 text-purple-700' },
      PUBLISHED: { label: 'Published', className: 'bg-green-100 text-green-700' },
      ON_HOLD: { label: 'On Hold', className: 'bg-red-100 text-red-700' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getCurrentStage = (stages) => {
    if (!stages || stages.length === 0) return 'Not Started';
    const current = stages.find((s) => s.status === 'IN_PROGRESS' || s.status === 'AWAITING_APPROVAL');
    if (current) {
      return current.stageType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    }
    const completed = stages.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
    return completed === stages.length ? 'Completed' : 'Pending';
  };

  const getStageProgress = (stages) => {
    if (!stages || stages.length === 0) return 0;
    const completed = stages.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
    return Math.round((completed / stages.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading books...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">All Books</h1>
          <p className="text-muted-foreground mt-1">Manage books across all authors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => { resetForm(); setAddDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Book
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, UID, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="FORMATTING">Formatting</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            All Books ({filteredBooks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No books in the system yet</p>
              <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add First Book
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Book</th>
                    <th className="text-left p-4 font-medium">Author</th>
                    <th className="text-left p-4 font-medium">ISBN</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Stage</th>
                    <th className="text-left p-4 font-medium">Progress</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <Link 
                            href={`/admin/books/${book.id}`} 
                            className="font-medium text-primary hover:underline cursor-pointer"
                          >
                            {book.title}
                          </Link>
                          {book.category && (
                            <p className="text-xs text-muted-foreground">{book.category}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{book.author?.name || 'Unknown'}</p>
                            <code className="text-xs text-muted-foreground">
                              {book.author?.authorUid || '-'}
                            </code>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {book.isbnPaperback ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">PB</Badge>
                              <code className="text-xs">{book.isbnPaperback}</code>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No ISBN</span>
                          )}
                          {book.isbnHardcover && (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">HC</Badge>
                              <code className="text-xs">{book.isbnHardcover}</code>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(book.status)}</td>
                      <td className="p-4 text-sm">{getCurrentStage(book.publishingStages)}</td>
                      <td className="p-4">
                        <div className="w-24">
                          <div className="flex items-center gap-2">
                            <Progress value={getStageProgress(book.publishingStages)} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {getStageProgress(book.publishingStages)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditIsbn(book)}
                            title="Edit ISBN"
                          >
                            <Hash className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/books/${book.id}`}>
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditIsbn(book)}>
                                <Edit2 className="h-4 w-4 mr-2" /> Edit ISBN
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Book Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Book</DialogTitle>
            <DialogDescription>
              Create a new book entry. ISBN can be added later when assigned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Book title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Author *</Label>
              <Select
                value={formData.authorId}
                onValueChange={(v) => setFormData({ ...formData, authorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.authorUid})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                placeholder="e.g., Fiction, Poetry"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief book description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Note:</strong> ISBN fields will be available after creation. The book will initially be linked via Author UID.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBook}>Create Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit ISBN Dialog */}
      <Dialog open={editIsbnDialogOpen} onOpenChange={setEditIsbnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit ISBN</DialogTitle>
            <DialogDescription>
              {selectedBook?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paperback ISBN (Primary)</Label>
              <Input
                placeholder="978-X-XXX-XXXXX-X"
                value={isbnData.paperbackIsbn}
                onChange={(e) => setIsbnData({ ...isbnData, paperbackIsbn: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">This becomes the canonical ISBN for linking</p>
            </div>

            <div className="space-y-2">
              <Label>Hardcover ISBN</Label>
              <Input
                placeholder="978-X-XXX-XXXXX-X"
                value={isbnData.hardcoverIsbn}
                onChange={(e) => setIsbnData({ ...isbnData, hardcoverIsbn: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ebook ISBN (Optional)</Label>
              <Input
                placeholder="978-X-XXX-XXXXX-X"
                value={isbnData.ebookIsbn}
                onChange={(e) => setIsbnData({ ...isbnData, ebookIsbn: e.target.value })}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800">Important:</p>
              <p className="text-amber-700">Once ISBN is assigned, it becomes the primary key for all sales and royalty tracking.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIsbnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateIsbn}>Save ISBN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Books from CSV</DialogTitle>
            <DialogDescription>
              Paste CSV data with book information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-medium mb-1">Expected columns:</p>
              <code>Title, Author UID (or Author Email), Paperback ISBN, Hardcover ISBN, Category, Language</code>
              <p className="mt-2 font-medium">Example:</p>
              <code>My Book,WP-AUTH-000001,978-1-234-56789-0,,Fiction,English</code>
            </div>

            <textarea
              className="w-full h-48 p-3 border rounded-lg text-sm font-mono"
              placeholder="Paste your CSV data here..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImportCSV}>
              <Upload className="mr-2 h-4 w-4" /> Import Books
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
