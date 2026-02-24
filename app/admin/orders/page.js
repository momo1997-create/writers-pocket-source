'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Filter,
  Settings,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', description: '', color: '#3b82f6' });

  useEffect(() => {
    fetchOrders();
    fetchStages();
  }, [statusFilter]);

  const fetchOrders = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || {});
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const res = await fetch('/api/admin/orders/stages');
      const data = await res.json();
      setStages(data.stages || []);
    } catch (error) {
      console.error('Failed to load stages:', error);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      setSelectedOrder(data.order);
      setViewDialogOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load order', variant: 'destructive' });
    }
  };

  const handleMoveStage = async (orderId, stageId) => {
    try {
      const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
      const res = await fetch(`/api/admin/orders/${orderId}/move-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, movedById: user.id }),
      });

      if (!res.ok) throw new Error('Failed to update stage');

      toast({ title: 'Success', description: 'Order stage updated' });
      fetchOrders();
      if (selectedOrder) handleViewOrder(orderId);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateStage = async () => {
    if (!newStage.name) {
      toast({ title: 'Error', description: 'Stage name is required', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/admin/orders/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStage, sortOrder: stages.length }),
      });

      if (!res.ok) throw new Error('Failed to create stage');

      toast({ title: 'Success', description: 'Stage created' });
      setStageDialogOpen(false);
      setNewStage({ name: '', description: '', color: '#3b82f6' });
      fetchStages();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      toast({ title: 'Success', description: 'Order status updated' });
      fetchOrders();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage all orders</p>
        </div>
        <Button variant="outline" onClick={() => setStageDialogOpen(true)}>
          <Settings className="mr-2 h-4 w-4" /> Manage Stages
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => {
          const count = orders.filter(o => o.status === status).length;
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter(status)}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground capitalize">{status.toLowerCase()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, name, email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            All Orders ({pagination.total || orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Order #</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Items</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Stage</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{order.orderNumber}</code>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{order.shippingName}</div>
                        <div className="text-xs text-muted-foreground">{order.shippingEmail}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {order.items?.length || 0} items
                        </div>
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(order.totalAmount)}</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4">
                        {order.currentStage ? (
                          <Badge style={{ backgroundColor: order.currentStage.color }} className="text-white">
                            {order.currentStage.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              <code className="text-xs bg-muted px-2 py-1 rounded">{selectedOrder?.orderNumber}</code>
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="history">Stage History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Select value={selectedOrder.status} onValueChange={(v) => handleUpdateStatus(selectedOrder.id, v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="SHIPPED">Shipped</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stage</Label>
                    <Select value={selectedOrder.currentStageId || 'none'} onValueChange={(v) => v !== 'none' && handleMoveStage(selectedOrder.id, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Stage</SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Amount</Label>
                    <p className="text-xl font-bold">{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment</Label>
                    <p>{selectedOrder.razorpayPaymentId ? 'Paid' : 'Pending'}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  <p>{selectedOrder.shippingName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shippingAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.shippingCity}, {selectedOrder.shippingState} {selectedOrder.shippingZipCode}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shippingPhone}</p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Customer</h4>
                  <p>{selectedOrder.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.user?.email}</p>
                  {selectedOrder.user?.authorUid && (
                    <code className="text-xs bg-muted px-2 py-1 rounded">{selectedOrder.user.authorUid}</code>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="items">
                <div className="space-y-3">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      {item.book?.coverImage && (
                        <img src={item.book.coverImage} alt="" className="w-12 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.book?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.format && <span>{item.format} • </span>}
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history">
                {selectedOrder.stageHistory?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrder.stageHistory.map((h, idx) => (
                      <div key={h.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: h.stage?.color || '#gray' }}>
                          <span className="text-white text-xs">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{h.stage?.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(h.movedAt)}</p>
                          {h.notes && <p className="text-sm mt-1">{h.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No stage history</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Stages Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Order Stages</DialogTitle>
            <DialogDescription>Define custom stages for order tracking</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {stages.length > 0 && (
              <div className="space-y-2">
                {stages.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: s.color }} />
                    <span className="flex-1">{s.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Add New Stage</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Stage name"
                  value={newStage.name}
                  onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                />
                <Input
                  placeholder="Description"
                  value={newStage.description}
                  onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Label>Color:</Label>
                  <input
                    type="color"
                    value={newStage.color}
                    onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                </div>
                <Button onClick={handleCreateStage} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Stage
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
