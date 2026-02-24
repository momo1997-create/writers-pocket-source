'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Send,
  Book,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function AuthorQueriesPage() {
  const { toast } = useToast();
  const [queries, setQueries] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [newQueryOpen, setNewQueryOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');

  const [newQuery, setNewQuery] = useState({
    subject: '',
    description: '',
    type: 'GENERAL',
    bookId: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [queriesRes, booksRes] = await Promise.all([
        fetch('/api/author/queries'),
        fetch('/api/author/books'),
      ]);
      const queriesData = await queriesRes.json();
      const booksData = await booksRes.json();
      setQueries(queriesData.queries || []);
      setBooks(booksData.books || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuery = async () => {
    if (!newQuery.subject || !newQuery.description) {
      toast({ title: 'Error', description: 'Subject and description are required', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/author/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuery),
      });
      if (!res.ok) throw new Error('Failed to create query');
      toast({ title: 'Success', description: 'Query submitted successfully' });
      setNewQueryOpen(false);
      setNewQuery({ subject: '', description: '', type: 'GENERAL', bookId: '', priority: 'MEDIUM' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`/api/author/queries/${selectedQuery.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: replyText }),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      toast({ title: 'Sent', description: 'Reply sent successfully' });
      setReplyText('');
      fetchData();
      // Refresh selected query
      const updatedQuery = queries.find(q => q.id === selectedQuery.id);
      if (updatedQuery) setSelectedQuery(updatedQuery);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      OPEN: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
      IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
      WAITING_RESPONSE: { label: 'Waiting Response', className: 'bg-orange-100 text-orange-700' },
      RESOLVED: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
      CLOSED: { label: 'Closed', className: 'bg-gray-100 text-gray-700' },
    };
    const config = map[status] || { label: status, className: 'bg-gray-100' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredQueries = filter === 'all' ? queries : queries.filter(q => q.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading queries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Queries</h1>
          <p className="text-muted-foreground mt-1">View and manage your support queries</p>
        </div>
        <Button onClick={() => setNewQueryOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Raise Query
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queries</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="WAITING_RESPONSE">Waiting Response</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Query List */}
        <div className="space-y-4">
          {filteredQueries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No queries found</p>
              </CardContent>
            </Card>
          ) : (
            filteredQueries.map((query) => (
              <Card
                key={query.id}
                className={`cursor-pointer transition-all ${selectedQuery?.id === query.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setSelectedQuery(query)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{query.subject}</h3>
                    {getStatusBadge(query.status)}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{query.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {query.book && (
                      <span className="flex items-center gap-1">
                        <Book className="h-3 w-3" /> {query.book.title}
                      </span>
                    )}
                    <span>{new Date(query.createdAt).toLocaleDateString()}</span>
                    <span>{query.comments?.length || 0} replies</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Query Detail / Conversation */}
        <Card className="h-fit sticky top-4">
          {selectedQuery ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedQuery.subject}</CardTitle>
                    <CardDescription>
                      {selectedQuery.book?.title && `Book: ${selectedQuery.book.title} • `}
                      Created: {new Date(selectedQuery.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedQuery.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Original Message */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">You</p>
                  <p className="text-sm">{selectedQuery.description}</p>
                </div>

                {/* Comments Thread */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedQuery.comments?.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-lg p-3 ${comment.userRole === 'AUTHOR' ? 'bg-primary/10 ml-8' : 'bg-muted/50 mr-8'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium">{comment.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                {selectedQuery.status !== 'CLOSED' && selectedQuery.status !== 'RESOLVED' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={handleReply} disabled={!replyText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Select a query to view conversation</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Query Dialog */}
      <Dialog open={newQueryOpen} onOpenChange={setNewQueryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief summary of your query"
                value={newQuery.subject}
                onChange={(e) => setNewQuery({ ...newQuery, subject: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newQuery.type}
                  onValueChange={(v) => setNewQuery({ ...newQuery, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="STAGE_SPECIFIC">Publishing Stage</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="CONTENT">Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Book</Label>
                <Select
                  value={newQuery.bookId || 'none'}
                  onValueChange={(v) => setNewQuery({ ...newQuery, bookId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select book" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe your query in detail..."
                value={newQuery.description}
                onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewQueryOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateQuery}>Submit Query</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
