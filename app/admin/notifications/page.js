'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  User,
  Search,
  Filter,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    type: 'GENERAL',
    title: '',
    message: '',
    link: '',
    ctaText: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notificationsRes, usersRes] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/admin/users?role=AUTHOR&limit=500'),
      ]);
      const notificationsData = await notificationsRes.json();
      const usersData = await usersRes.json();
      setNotifications(notificationsData.notifications || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.title || !formData.message) {
      toast({ title: 'Error', description: 'Title and message are required', variant: 'destructive' });
      return;
    }

    if (!sendToAll && selectedUsers.length === 0) {
      toast({ title: 'Error', description: 'Select at least one recipient', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserIds: sendToAll ? undefined : selectedUsers,
          targetAll: sendToAll,
          ...formData,
        }),
      });

      if (!res.ok) throw new Error('Failed to send notification');

      const data = await res.json();
      toast({ title: 'Success', description: `Notification sent to ${data.count} user(s)` });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'GENERAL',
      title: '',
      message: '',
      link: '',
      ctaText: '',
    });
    setSelectedUsers([]);
    setSendToAll(false);
  };

  const getTypeLabel = (type) => {
    const labels = {
      STAGE_UPDATE: 'Stage Update',
      QUERY_RESPONSE: 'Query Response',
      PAYMENT_RECEIVED: 'Payment',
      ORDER_STATUS: 'Order',
      ROYALTY_PAYMENT: 'Royalty',
      SYSTEM: 'System',
      GENERAL: 'General',
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      ROYALTY_PAYMENT: 'bg-green-100 text-green-700',
      PAYMENT_RECEIVED: 'bg-green-100 text-green-700',
      STAGE_UPDATE: 'bg-blue-100 text-blue-700',
      QUERY_RESPONSE: 'bg-purple-100 text-purple-700',
      ORDER_STATUS: 'bg-orange-100 text-orange-700',
      SYSTEM: 'bg-red-100 text-red-700',
      GENERAL: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Filter users for search
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.authorUid?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">Send in-app notifications to authors</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Send className="mr-2 h-4 w-4" /> Send Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-xl font-bold">{notifications.length}</p>
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
                <p className="text-sm text-muted-foreground">Read</p>
                <p className="text-xl font-bold">{notifications.filter(n => n.isRead).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-xl font-bold">{notifications.filter(n => !n.isRead).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>History of notifications sent to authors</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 50).map((n) => (
                <div key={n.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTypeBadgeColor(n.type)}>{getTypeLabel(n.type)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                    {n.link && (
                      <p className="text-xs text-blue-600 mt-1">Link: {n.link}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium">{n.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{n.user?.authorUid}</p>
                    <Badge variant={n.isRead ? 'default' : 'secondary'} className="mt-1 text-xs">
                      {n.isRead ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="STAGE_UPDATE">Stage Update</SelectItem>
                  <SelectItem value="ROYALTY_PAYMENT">Royalty Payment</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Write your message..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label>Link (optional)</Label>
              <Input
                placeholder="/author/royalties"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Add a link for the notification to redirect to</p>
            </div>

            {/* CTA Text */}
            <div className="space-y-2">
              <Label>CTA Button Text (optional)</Label>
              <Input
                placeholder="View Details"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              />
            </div>

            {/* Recipients */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Recipients</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendToAll"
                    checked={sendToAll}
                    onCheckedChange={(c) => {
                      setSendToAll(c);
                      if (c) setSelectedUsers([]);
                    }}
                  />
                  <label htmlFor="sendToAll" className="text-sm">Send to all authors</label>
                </div>
              </div>

              {!sendToAll && (
                <>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search authors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground text-sm">No authors found</p>
                    ) : (
                      filteredUsers.slice(0, 50).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            if (selectedUsers.includes(user.id)) {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            } else {
                              setSelectedUsers([...selectedUsers, user.id]);
                            }
                          }}
                        >
                          <Checkbox checked={selectedUsers.includes(user.id)} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.authorUid}</code>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedUsers.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedUsers.length} author(s) selected
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendNotification}>
              <Send className="mr-2 h-4 w-4" /> Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
