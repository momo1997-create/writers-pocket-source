'use client';

import { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  GripVertical,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/hooks/use-toast';

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    isActive: true,
    seoTitle: '',
    seoDesc: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId || null,
          isActive: formData.isActive,
          seoTitle: formData.seoTitle || formData.name,
          seoDesc: formData.seoDesc,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save category');
      }

      toast({
        title: 'Success',
        description: editingCategory ? 'Category updated' : 'Category created',
      });

      setDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete category');
      }

      toast({
        title: 'Success',
        description: 'Category deleted',
      });

      fetchCategories();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
      seoTitle: category.seoTitle || '',
      seoDesc: category.seoDesc || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      parentId: '',
      isActive: true,
      seoTitle: '',
      seoDesc: '',
    });
  };

  const toggleExpanded = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getAllCategories = () => {
    const flat = [];
    const flatten = (cats, level = 0) => {
      cats.forEach((cat) => {
        flat.push({ ...cat, level });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, level + 1);
        }
      });
    };
    flatten(categories);
    return flat;
  };

  const renderCategoryRow = (category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories[category.id];

    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between p-3 hover:bg-muted/50 border-b ${
            level > 0 ? 'pl-' + (level * 6 + 3) : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="p-1 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.name}</span>
                {!category.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Slug: {category.slug}
                {category._count?.books > 0 && (
                  <span className="ml-2">• {category._count.books} books</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(category.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>{category.children.map((child) => renderCategoryRow(child, level + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Categories / Genres</h1>
          <p className="text-muted-foreground mt-1">Manage book categories for the shop</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            All Categories
          </CardTitle>
          <CardDescription>
            Organize your books with categories and subcategories
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No categories yet</p>
              <p className="text-sm">Create your first category to organize books</p>
            </div>
          ) : (
            <div className="divide-y">
              {categories.map((category) => renderCategoryRow(category))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details'
                : 'Create a new category for organizing books'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Fiction, Poetry, Self-Help"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {getAllCategories()
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {'—'.repeat(cat.level)} {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in shop and listings</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">SEO Settings</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">SEO Title</Label>
                  <Input
                    id="seoTitle"
                    placeholder="Title for search engines"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seoDesc">SEO Description</Label>
                  <Textarea
                    id="seoDesc"
                    placeholder="Description for search engines"
                    value={formData.seoDesc}
                    onChange={(e) => setFormData({ ...formData, seoDesc: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
