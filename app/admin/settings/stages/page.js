'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  List,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';

// Valid stage types from the enum
const STAGE_TYPES = [
  'CONTRACT_SIGNED',
  'MANUSCRIPT_RECEIVED',
  'EDITING',
  'COVER_DESIGN',
  'FORMATTING',
  'ISBN_ALLOTTED',
  'PRINTING_STARTED',
  'QUALITY_CHECK',
  'DISPATCHED',
  'DELIVERED',
  'EBOOK_UPLOAD',
];

export default function StageTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    stageType: '',
    name: '',
    description: '',
    isDefault: false,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/stage-templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.stageType || !formData.name) {
      toast({ title: 'Error', description: 'Stage type and name are required', variant: 'destructive' });
      return;
    }

    try {
      let res;
      if (editingTemplate) {
        res = await fetch(`/api/admin/stage-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch('/api/admin/stage-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save template');
      }

      toast({ title: 'Success', description: editingTemplate ? 'Template updated' : 'Template created' });
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/admin/stage-templates/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast({ title: 'Success', description: 'Template deleted' });
      fetchTemplates();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleDefault = async (template) => {
    try {
      await fetch(`/api/admin/stage-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: !template.isDefault }),
      });
      fetchTemplates();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      stageType: template.stageType,
      name: template.name,
      description: template.description || '',
      isDefault: template.isDefault,
      sortOrder: template.sortOrder,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      stageType: '',
      name: '',
      description: '',
      isDefault: false,
      sortOrder: templates.length,
    });
    setEditingTemplate(null);
  };

  // Get available stage types (not already used)
  const availableTypes = editingTemplate 
    ? STAGE_TYPES 
    : STAGE_TYPES.filter(t => !templates.some(tpl => tpl.stageType === t));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Stage Templates</h1>
            <p className="text-muted-foreground mt-1">Manage publishing workflow stages</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} disabled={availableTypes.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Add Stage
        </Button>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Stage templates define the publishing workflow. Stages marked as <strong>Default</strong> will 
            be automatically added to new books. Toggle the switch to enable/disable defaults.
          </p>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Stages ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stage templates configured</p>
              <p className="text-sm mt-1">Add your first stage to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.sort((a, b) => a.sortOrder - b.sortOrder).map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {template.stageType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Default</span>
                      <Switch
                        checked={template.isDefault}
                        onCheckedChange={() => handleToggleDefault(template)}
                      />
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Stage Template' : 'Add Stage Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage Type *</Label>
              <Select
                value={formData.stageType}
                onValueChange={(v) => setFormData({ ...formData, stageType: v, name: v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) })}
                disabled={!!editingTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Contract Signed"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this stage"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(c) => setFormData({ ...formData, isDefault: c })}
              />
              <Label>Enable by default for new books</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
