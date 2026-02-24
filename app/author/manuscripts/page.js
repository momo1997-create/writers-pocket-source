'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Plus, Edit2, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AuthorManuscriptsPage() {
  const { toast } = useToast();
  const [manuscripts, setManuscripts] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [msRes, booksRes] = await Promise.all([
        fetch(`/api/author/manuscripts?authorId=${user.id}`),
        fetch(`/api/author/books?authorId=${user.id}`),
      ]);
      const msData = await msRes.json();
      const booksData = await booksRes.json();
      setManuscripts(msData.manuscripts || []);
      setBooks(booksData.books || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      UPLOADED: { label: 'Draft', icon: Clock, className: 'bg-gray-100 text-gray-700' },
      UNDER_REVIEW: { label: 'Under Review', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-700' },
      APPROVED: { label: 'Approved', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
      REJECTED: { label: 'Rejected', icon: AlertCircle, className: 'bg-red-100 text-red-700' },
      FORMATTING: { label: 'Formatting', icon: FileText, className: 'bg-blue-100 text-blue-700' },
      FORMATTED: { label: 'Formatted', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
    };
    const config = map[status] || { label: status, icon: Clock, className: 'bg-gray-100' };
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading manuscripts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Writing Desk</h1>
          <p className="text-muted-foreground mt-1">Manage your book manuscripts and drafts</p>
        </div>
        <Link href="/author/manuscripts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Manuscript
          </Button>
        </Link>
      </div>

      {manuscripts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No manuscripts yet</h3>
            <p className="text-muted-foreground mb-4">Start writing your first manuscript using our formatter</p>
            <Link href="/author/manuscripts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create New Manuscript
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {manuscripts.map((ms) => (
            <Card key={ms.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{ms.book?.title || 'Untitled'}</h3>
                      {getStatusBadge(ms.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Version {ms.version} • Last updated: {new Date(ms.updatedAt).toLocaleDateString()}
                    </p>
                    {ms.notes && (
                      <p className="text-sm text-muted-foreground">{ms.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {ms.status === 'UPLOADED' && (
                      <>
                        <Link href={`/author/manuscripts/${ms.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit2 className="h-4 w-4 mr-1" /> Edit
                          </Button>
                        </Link>
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-1" /> Submit
                        </Button>
                      </>
                    )}
                    {ms.status !== 'UPLOADED' && (
                      <Link href={`/author/manuscripts/${ms.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    )}
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
