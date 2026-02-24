'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function AdminPackagesPage() {
  const { toast } = useToast();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    features: '',
    isActive: true,
    isPopular: false,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/admin/packages');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load packages', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: 'Error', description: 'Name and price are required', variant: 'destructive' });
      return;
    }

    try {
      // Parse features from newline-separated text to array
      const featuresArray = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          features: featuresArray,
          isActive: formData.isActive,
          isPopular: formData.isPopular,
          sortOrder: packages.length,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create package');
      }

      toast({ title: 'Success', description: 'Package created successfully' });
      setDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdatePackage = async () => {
    if (!selectedPackage) return;

    try {
      // Parse features from newline-separated text to array
      const featuresArray = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const res = await fetch(`/api/admin/packages/${selectedPackage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          features: featuresArray,
          isActive: formData.isActive,
          isPopular: formData.isPopular,
          sortOrder: formData.sortOrder,
        }),
      });

      if (!res.ok) throw new Error('Failed to update package');

      toast({ title: 'Success', description: 'Package updated successfully' });
      setDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePackage = async () => {
    if (!selectedPackage) return;

    try {
      const res = await fetch(`/api/admin/packages/${selectedPackage.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete package');

      toast({ title: 'Success', description: 'Package deleted successfully' });
      setDeleteDialogOpen(false);
      setSelectedPackage(null);
      fetchPackages();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (pkg) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });

      if (!res.ok) throw new Error('Failed to update package');

      toast({ title: 'Success', description: `Package ${pkg.isActive ? 'hidden' : 'shown'}` });
      fetchPackages();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleTogglePopular = async (pkg) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPopular: !pkg.isPopular }),
      });

      if (!res.ok) throw new Error('Failed to update package');

      toast({ title: 'Success', description: `Popular badge ${pkg.isPopular ? 'removed' : 'added'}` });
      fetchPackages();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditPackage = (pkg) => {
    setSelectedPackage(pkg);
    // Convert features array to newline-separated string
    const featuresText = Array.isArray(pkg.features) 
      ? pkg.features.join('\n') 
      : '';
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price.toString(),
      features: featuresText,
      isActive: pkg.isActive,
      isPopular: pkg.isPopular,
      sortOrder: pkg.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (pkg) => {
    setSelectedPackage(pkg);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedPackage(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      features: '',
      isActive: true,
      isPopular: false,
      sortOrder: 0,
    });
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Publishing Packages</h1>
          <p className="text-muted-foreground mt-1">Manage service packages and pricing</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Package
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{packages.length}</div>
            <p className="text-xs text-muted-foreground">Total Packages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {packages.filter(p => p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {packages.filter(p => p.isPopular).length}
            </div>
            <p className="text-xs text-muted-foreground">Marked Popular</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {packages.filter(p => !p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Hidden</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No packages found</p>
            <Button className="mt-4" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create First Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative ${!pkg.isActive ? 'opacity-60' : ''} ${pkg.isPopular ? 'ring-2 ring-primary' : ''}`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">
                    <Star className="h-3 w-3 mr-1" /> Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <div className="text-3xl font-bold mt-2">{formatCurrency(pkg.price)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleActive(pkg)}
                      title={pkg.isActive ? 'Hide package' : 'Show package'}
                    >
                      {pkg.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleTogglePopular(pkg)}
                      title={pkg.isPopular ? 'Remove popular' : 'Mark as popular'}
                    >
                      <Star className={`h-4 w-4 ${pkg.isPopular ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  </div>
                </div>
                {pkg.description && (
                  <CardDescription className="mt-2">{pkg.description}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {pkg.features.slice(0, 5).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {pkg.features.length > 5 && (
                      <p className="text-xs text-muted-foreground pl-6">
                        +{pkg.features.length - 5} more features
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {pkg.isActive ? (
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Hidden</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleEditPackage(pkg)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDelete(pkg)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Package Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPackage ? 'Edit Package' : 'Add New Package'}</DialogTitle>
            <DialogDescription>
              {selectedPackage ? 'Update package details' : 'Create a new publishing package'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input
                placeholder="e.g., Starter Package"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g., 9999"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this package..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                placeholder="Professional editing&#10;Cover design&#10;ISBN registration&#10;Distribution to 50+ stores"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter each feature on a new line. These will be displayed with checkmarks.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show on website</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Popular Badge</Label>
                <p className="text-xs text-muted-foreground">Highlight as recommended</p>
              </div>
              <Switch
                checked={formData.isPopular}
                onCheckedChange={(c) => setFormData({ ...formData, isPopular: c })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={selectedPackage ? handleUpdatePackage : handleCreatePackage}>
              {selectedPackage ? 'Update' : 'Create'} Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPackage?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePackage} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
