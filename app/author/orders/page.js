'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AuthorOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/author/orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      PENDING: { label: 'Pending', icon: Clock, className: 'bg-gray-100 text-gray-700' },
      PAYMENT_PENDING: { label: 'Payment Pending', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-700' },
      PAID: { label: 'Paid', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
      PROCESSING: { label: 'Processing', icon: Package, className: 'bg-blue-100 text-blue-700' },
      SHIPPED: { label: 'Shipped', icon: Truck, className: 'bg-purple-100 text-purple-700' },
      DELIVERED: { label: 'Delivered', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
      CANCELLED: { label: 'Cancelled', icon: AlertCircle, className: 'bg-red-100 text-red-700' },
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
        <div className="animate-pulse text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-1">Track your author copy orders</p>
        </div>
        <Link href="/author/orders/new">
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" /> Order Author Copies
          </Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Order author copies of your published books</p>
            <Link href="/author/orders/new">
              <Button>
                <ShoppingCart className="mr-2 h-4 w-4" /> Order Author Copies
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Items</p>
                        <p className="font-medium">{order.items?.length || 0} book(s)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Amount</p>
                        <p className="font-medium">₹{order.totalAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Order Date</p>
                        <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {order.currentStage && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Current Stage:</span>{' '}
                          <span className="font-medium">{order.currentStage.name}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <Link href={`/author/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" /> View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
