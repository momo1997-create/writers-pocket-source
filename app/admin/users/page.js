'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Eye,
  Upload,
  Download,
  UserCheck,
  UserX,
  DollarSign,
  Book,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'AUTHOR',
    isBlogWriter: false,
    alternateEmail: '',
    alternatePhone: '',
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || {});
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: 'Error', description: 'Name and email are required', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }

      toast({ title: 'Success', description: 'User created successfully' });
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update user');

      toast({ title: 'Success', description: 'User updated successfully' });
      setDialogOpen(false);
      resetForm();
      fetchUsers();
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
      const users = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const user = {};
        headers.forEach((h, idx) => {
          if (h.includes('email')) user.email = values[idx];
          else if (h.includes('name')) user.name = values[idx];
          else if (h.includes('phone')) user.phone = values[idx];
          else if (h.includes('role')) user.role = values[idx]?.toUpperCase() || 'AUTHOR';
        });
        if (user.email && user.name) users.push(user);
      }

      if (users.length === 0) {
        toast({ title: 'Error', description: 'No valid users found in CSV', variant: 'destructive' });
        return;
      }

      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });

      const data = await res.json();
      toast({
        title: 'Import Complete',
        description: `Success: ${data.results.success.length}, Skipped: ${data.results.skipped.length}, Errors: ${data.results.errors.length}`,
      });
      setImportDialogOpen(false);
      setCsvData('');
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data.user);
      setViewDialogOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load user details', variant: 'destructive' });
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isBlogWriter: user.isBlogWriter,
      alternateEmail: user.alternateEmail || '',
      alternatePhone: user.alternatePhone || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'AUTHOR',
      isBlogWriter: false,
      alternateEmail: '',
      alternatePhone: '',
    });
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground mt-1">Manage authors, admins, and team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or Author UID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="AUTHOR">Authors</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
            <SelectItem value="TEAM">Team</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleSearch}>
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({pagination.total || users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Author UID</th>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Books</th>
                    <th className="text-left p-4 font-medium">Royalties</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {user.authorUid || 'N/A'}
                        </code>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={user.email}>
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-xs text-muted-foreground">{user.phone}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'TEAM' ? 'secondary' : 'outline'}>
                          {user.role}
                        </Badge>
                        {user.isBlogWriter && (
                          <Badge variant="outline" className="ml-1 text-xs">Writer</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Book className="h-4 w-4 text-muted-foreground" />
                          {(user._count?.books || 0) + (user._count?.bookAuthorships || 0)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="text-green-600">{formatCurrency(user.paidRoyalty)} paid</div>
                          <div className="text-orange-600">{formatCurrency(user.unpaidRoyalty)} pending</div>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.isActive ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewUser(user.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
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

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Update user details' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!selectedUser}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+91..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTHOR">Author</SelectItem>
                    <SelectItem value="TEAM">Team</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alternate Email</Label>
                <Input
                  type="email"
                  value={formData.alternateEmail}
                  onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Phone</Label>
                <Input
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Blog Writer</Label>
                <p className="text-xs text-muted-foreground">Can write blog posts</p>
              </div>
              <Switch
                checked={formData.isBlogWriter}
                onCheckedChange={(c) => setFormData({ ...formData, isBlogWriter: c })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={selectedUser ? handleUpdateUser : handleCreateUser}>
              {selectedUser ? 'Update' : 'Create'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              {selectedUser?.authorUid && (
                <code className="text-xs bg-muted px-2 py-1 rounded">{selectedUser.authorUid}</code>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="books">Books</TabsTrigger>
                <TabsTrigger value="royalties">Royalties</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p>{selectedUser.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <Badge>{selectedUser.role}</Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Royalty Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-2xl font-bold">{formatCurrency(selectedUser.totalRoyalty)}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedUser.paidRoyalty)}</p>
                      <p className="text-xs text-muted-foreground">Paid</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(selectedUser.unpaidRoyalty)}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="books">
                {selectedUser.books?.length > 0 || selectedUser.bookAuthorships?.length > 0 ? (
                  <div className="space-y-2">
                    {[...(selectedUser.books || []), ...(selectedUser.bookAuthorships?.map(ba => ba.book) || [])].map((book) => (
                      <div key={book.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-xs text-muted-foreground">ISBN: {book.isbnPaperback || '-'}</p>
                        </div>
                        <Badge>{book.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No books linked</p>
                )}
              </TabsContent>

              <TabsContent value="royalties">
                {selectedUser.royalties?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.royalties.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm">{r.period}</p>
                          <p className="text-xs text-muted-foreground">{r.bucket} • {r.platform}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(r.amount)}</p>
                          <Badge variant={r.isPaid ? 'default' : 'secondary'} className="text-xs">
                            {r.isPaid ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No royalties yet</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Users from CSV</DialogTitle>
            <DialogDescription>
              Paste CSV data with columns: Name, Email, Phone, Role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-medium mb-1">Expected format:</p>
              <code>Name,Email,Phone,Role</code><br />
              <code>John Doe,john@email.com,+919876543210,AUTHOR</code>
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
              <Upload className="mr-2 h-4 w-4" /> Import Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
