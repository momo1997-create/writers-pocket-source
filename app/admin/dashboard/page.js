'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Book,
  Users,
  MessageSquare,
  UserPlus,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Books',
      value: stats?.totalBooks || 0,
      icon: Book,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      href: '/admin/books',
    },
    {
      title: 'Total Authors',
      value: stats?.totalAuthors || 0,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100',
      href: '/admin/users',
    },
    {
      title: 'Paid Orders',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      href: '/admin/orders',
    },
    {
      title: 'Open Queries',
      value: stats?.pendingQueries || 0,
      icon: MessageSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      href: '/admin/queries',
    },
    {
      title: 'New Leads',
      value: stats?.newLeads || 0,
      icon: UserPlus,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      href: '/admin/leads',
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
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Platform statistics and recent activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Books by Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Books by Status</CardTitle>
            <CardDescription>Distribution of books across publishing stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.booksByStatus?.map((item, index) => {
                const statusColors = {
                  DRAFT: 'bg-gray-200',
                  IN_PROGRESS: 'bg-blue-200',
                  UNDER_REVIEW: 'bg-yellow-200',
                  FORMATTING: 'bg-purple-200',
                  PUBLISHED: 'bg-green-200',
                  ON_HOLD: 'bg-red-200',
                };
                const total = stats.booksByStatus.reduce((acc, i) => acc + i._count, 0);
                const percentage = total > 0 ? Math.round((item._count / total) * 100) : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.status.replace('_', ' ')}</span>
                      <span className="text-muted-foreground">
                        {item._count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[item.status] || 'bg-gray-200'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!stats?.booksByStatus || stats.booksByStatus.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No books yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/leads">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Lead
              </Button>
            </Link>
            <Link href="/admin/queries?status=OPEN">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                View Open Queries
              </Button>
            </Link>
            <Link href="/admin/books?status=IN_PROGRESS">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                Books In Progress
              </Button>
            </Link>
            <Link href="/admin/packages">
              <Button variant="outline" className="w-full justify-start">
                <Book className="mr-2 h-4 w-4" />
                Manage Packages
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders across the platform</CardDescription>
          </div>
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders?.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-sm">{order.orderNumber}</td>
                    <td>{order.user?.name || 'N/A'}</td>
                    <td>{order.items?.length || 0} item(s)</td>
                    <td>₹{order.totalAmount?.toLocaleString()}</td>
                    <td>
                      <Badge
                        className={`${
                          order.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
