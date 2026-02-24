'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Book,
  TrendingUp,
  DollarSign,
  FileText,
  MessageSquare,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function AuthorDashboard() {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('wp_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchDashboardData(userData.id);
    }
  }, []);

  const fetchDashboardData = async (userId) => {
    try {
      const [booksRes, analyticsRes, queriesRes] = await Promise.all([
        fetch(`/api/author/books?authorId=${userId}`),
        fetch(`/api/author/analytics?authorId=${userId}`),
        fetch(`/api/author/queries?authorId=${userId}`),
      ]);

      const booksData = await booksRes.json();
      const analyticsData = await analyticsRes.json();
      const queriesData = await queriesRes.json();

      setBooks(booksData.books || []);
      setAnalytics(analyticsData);
      setQueries(queriesData.queries || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      DRAFT: { label: 'Draft', variant: 'secondary' },
      IN_PROGRESS: { label: 'In Progress', variant: 'default' },
      UNDER_REVIEW: { label: 'Under Review', variant: 'outline' },
      FORMATTING: { label: 'Formatting', variant: 'outline' },
      PUBLISHED: { label: 'Published', variant: 'default' },
      ON_HOLD: { label: 'On Hold', variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStageProgress = (stages) => {
    if (!stages || stages.length === 0) return 0;
    const completed = stages.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
    return Math.round((completed / stages.length) * 100);
  };

  const stats = [
    {
      title: 'Total Books',
      value: books.length,
      icon: Book,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      href: '/author/books',
    },
    {
      title: 'In Progress',
      value: books.filter((b) => b.status === 'IN_PROGRESS').length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      href: '/author/books',
    },
    {
      title: 'Published',
      value: books.filter((b) => b.status === 'PUBLISHED').length,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      href: '/author/books',
    },
    {
      title: 'Unpaid Royalties',
      value: `₹${(analytics?.unpaidTotal || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
      href: '/author/royalties',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {user?.name || 'Author'}!</h1>
          <p className="text-muted-foreground mt-1">Here's an overview of your publishing journey.</p>
        </div>
        <Link href="/author/manuscripts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Submit Your Manuscript
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Books Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Your Books</CardTitle>
                <CardDescription>Track publishing progress</CardDescription>
              </div>
              <Link href="/author/books">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {books.length === 0 ? (
                <div className="text-center py-8">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No books yet. Start your publishing journey!</p>
                  <Link href="/author/manuscripts/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Submit Your Manuscript
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {books.slice(0, 3).map((book) => (
                    <Link
                      key={book.id}
                      href={`/author/books/${book.id}`}
                      className="block p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{book.title}</h3>
                            {getStatusBadge(book.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {book.subtitle || book.category || 'No description'}
                          </p>
                        </div>
                      </div>
                      {book.publishingStages && book.publishingStages.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Publishing Progress</span>
                            <span>{getStageProgress(book.publishingStages)}%</span>
                          </div>
                          <Progress value={getStageProgress(book.publishingStages)} className="h-2" />
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity / Queries */}
        <div className="space-y-6">
          {/* Open Queries */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Open Queries</CardTitle>
                <Link href="/author/queries">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {queries.filter((q) => q.status !== 'RESOLVED' && q.status !== 'CLOSED').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No open queries
                </p>
              ) : (
                <div className="space-y-3">
                  {queries
                    .filter((q) => q.status !== 'RESOLVED' && q.status !== 'CLOSED')
                    .slice(0, 3)
                    .map((query) => (
                      <Link
                        key={query.id}
                        href={`/author/queries/${query.id}`}
                        className="block p-3 rounded-lg border hover:border-primary transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{query.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {query.book?.title || 'General Query'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {query.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Earnings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics?.monthlySummary || analytics.monthlySummary.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No earnings data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.monthlySummary.slice(0, 4).map((month, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{month.period || 'N/A'}</span>
                      <span className="font-semibold">₹{(month._sum?.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/author/royalties" className="block mt-4">
                <Button variant="outline" className="w-full">
                  View Royalty Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
