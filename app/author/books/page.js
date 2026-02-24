'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Book, Search, Filter, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AuthorBooksPage() {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('wp_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchBooks(userData.id);
    }
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchQuery, statusFilter]);

  const fetchBooks = async (authorId) => {
    try {
      const res = await fetch(`/api/author/books?authorId=${authorId}`);
      const data = await res.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = [...books];

    if (searchQuery) {
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (book.subtitle && book.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((book) => book.status === statusFilter);
    }

    setFilteredBooks(filtered);
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

  const getStageProgress = (stages) => {
    if (!stages || stages.length === 0) return 0;
    const completed = stages.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
    return Math.round((completed / stages.length) * 100);
  };

  const getCurrentStage = (stages) => {
    if (!stages || stages.length === 0) return 'Not Started';
    const currentStage = stages.find((s) => s.status === 'IN_PROGRESS' || s.status === 'AWAITING_APPROVAL');
    if (currentStage) {
      return currentStage.stageType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return 'Not Started';
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Books</h1>
          <p className="text-muted-foreground mt-1">Manage and track your book projects</p>
        </div>
        <Link href="/author/books/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Book
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search books..."
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

      {/* Books List */}
      {filteredBooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {books.length === 0 ? 'No Books Yet' : 'No Results Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {books.length === 0
                ? 'Start your publishing journey by creating your first book.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {books.length === 0 && (
              <Link href="/author/books/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Book
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:border-primary transition-colors">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Book Cover Placeholder */}
                  <div className="w-16 h-20 md:w-20 md:h-28 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Book className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Book Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold truncate">{book.title}</h3>
                      {getStatusBadge(book.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {book.subtitle || book.category || 'No description'}
                    </p>
                    
                    {/* Progress */}
                    {book.publishingStages && book.publishingStages.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Current: {getCurrentStage(book.publishingStages)}</span>
                          <span>{getStageProgress(book.publishingStages)}% Complete</span>
                        </div>
                        <Progress value={getStageProgress(book.publishingStages)} className="h-2" />
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Created: {new Date(book.createdAt).toLocaleDateString()}</span>
                      {book.manuscripts && book.manuscripts.length > 0 && (
                        <span>Manuscript v{book.manuscripts[0].version}</span>
                      )}
                      {book.isbn && <span>ISBN: {book.isbn}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/author/books/${book.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/author/books/${book.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/author/books/${book.id}/stages`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Stages
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
