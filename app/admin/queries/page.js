'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Book,
  Filter,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function AdminQueriesPage() {
  const { toast } = useToast();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchQueries();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedQuery?.comments]);

  const fetchQueries = async () => {
    try {
      const res = await fetch('/api/admin/queries');
      const data = await res.json();
      setQueries(data.queries || []);
      
      // Refresh selected query if exists
      if (selectedQuery) {
        const updated = data.queries?.find(q => q.id === selectedQuery.id);
        if (updated) setSelectedQuery(updated);
      }
    } catch (error) {
      console.error('Error fetching queries:', error);
      toast({ title: 'Error', description: 'Failed to load queries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedQuery) return;

    setSending(true);
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/queries/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId: selectedQuery.id,
          userId: user?.id,
          userName: user?.name || 'Team',
          userRole: user?.role || 'TEAM',
          comment: replyText,
          isInternal: false,
        }),
      });

      if (!res.ok) throw new Error('Failed to send reply');

      toast({ title: 'Sent', description: 'Reply sent successfully' });
      setReplyText('');
      fetchQueries();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const updateQueryStatus = async (newStatus) => {
    if (!selectedQuery) return;

    try {
      await fetch(`/api/queries/${selectedQuery.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      toast({ title: 'Updated', description: `Status changed to ${newStatus}` });
      fetchQueries();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      OPEN: { label: 'Open', className: 'bg-red-100 text-red-700' },
      IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
      WAITING_RESPONSE: { label: 'Awaiting Reply', className: 'bg-blue-100 text-blue-700' },
      RESOLVED: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
      CLOSED: { label: 'Closed', className: 'bg-gray-100 text-gray-700' },
    };
    const config = map[status] || { label: status, className: 'bg-gray-100' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      LOW: 'bg-gray-50 text-gray-600',
      MEDIUM: 'bg-blue-50 text-blue-600',
      HIGH: 'bg-orange-50 text-orange-600',
      URGENT: 'bg-red-50 text-red-600 animate-pulse',
    };
    return <Badge variant="outline" className={map[priority] || map.MEDIUM}>{priority}</Badge>;
  };

  // Filter queries
  const filteredQueries = queries.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !q.subject?.toLowerCase().includes(query) &&
        !q.author?.name?.toLowerCase().includes(query) &&
        !q.book?.title?.toLowerCase().includes(query)
      ) return false;
    }
    return true;
  });

  // Group by status for summary
  const statusCounts = {
    OPEN: queries.filter(q => q.status === 'OPEN').length,
    IN_PROGRESS: queries.filter(q => q.status === 'IN_PROGRESS').length,
    WAITING_RESPONSE: queries.filter(q => q.status === 'WAITING_RESPONSE').length,
    RESOLVED: queries.filter(q => q.status === 'RESOLVED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading queries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Query Management</h1>
          <p className="text-muted-foreground mt-1">Manage author queries and support tickets</p>
        </div>
        <Button variant="outline" onClick={fetchQueries}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={`cursor-pointer ${statusFilter === 'OPEN' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'OPEN' ? 'all' : 'OPEN')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Open</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{statusCounts.OPEN}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === 'IN_PROGRESS' ? 'ring-2 ring-yellow-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'all' : 'IN_PROGRESS')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">In Progress</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{statusCounts.IN_PROGRESS}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === 'WAITING_RESPONSE' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'WAITING_RESPONSE' ? 'all' : 'WAITING_RESPONSE')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Awaiting Reply</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{statusCounts.WAITING_RESPONSE}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === 'RESOLVED' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'RESOLVED' ? 'all' : 'RESOLVED')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Resolved</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{statusCounts.RESOLVED}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Split View */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Query List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {statusFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                Clear Filter
              </Button>
            )}
          </div>

          {/* Query List */}
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="space-y-2 pr-4">
              {filteredQueries.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No queries found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredQueries.map((query) => (
                  <Card
                    key={query.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedQuery?.id === query.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedQuery(query)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium line-clamp-1">{query.subject}</h3>
                        {getStatusBadge(query.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {query.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{query.author?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{query.comments?.length || 0} replies</span>
                          <span>•</span>
                          <span>{new Date(query.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation View */}
        <Card className="lg:col-span-3 flex flex-col h-[calc(100vh-250px)]">
          {selectedQuery ? (
            <>
              {/* Header */}
              <CardHeader className="border-b flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedQuery.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {selectedQuery.author?.name}
                      </span>
                      {selectedQuery.book && (
                        <span className="flex items-center gap-1">
                          <Book className="h-3 w-3" />
                          {selectedQuery.book.title}
                        </span>
                      )}
                      <span>{new Date(selectedQuery.createdAt).toLocaleString()}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(selectedQuery.priority)}
                    <Select value={selectedQuery.status} onValueChange={updateQueryStatus}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="WAITING_RESPONSE">Awaiting Reply</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Original Message */}
                  <div className="bg-muted/50 rounded-lg p-4 mr-12">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedQuery.author?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedQuery.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedQuery.description}</p>
                  </div>

                  {/* Thread */}
                  {selectedQuery.comments?.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-lg p-4 ${
                        comment.userRole === 'AUTHOR'
                          ? 'bg-muted/50 mr-12'
                          : 'bg-primary/10 ml-12'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          comment.userRole === 'AUTHOR' ? 'bg-primary/20' : 'bg-green-100'
                        }`}>
                          <User className={`h-4 w-4 ${
                            comment.userRole === 'AUTHOR' ? 'text-primary' : 'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {comment.userName}
                            {comment.userRole !== 'AUTHOR' && (
                              <Badge variant="outline" className="ml-2 text-xs">Team</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply Box */}
              {selectedQuery.status !== 'CLOSED' && (
                <div className="border-t p-4 flex-shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      className="flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSendReply();
                        }
                      }}
                    />
                    <Button onClick={handleSendReply} disabled={!replyText.trim() || sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Ctrl+Enter to send
                  </p>
                </div>
              )}
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a query to view conversation</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
