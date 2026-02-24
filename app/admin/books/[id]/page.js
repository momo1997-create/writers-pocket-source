'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Book,
  User,
  Calendar,
  AlertTriangle,
  Hash,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle,
  MessageSquare,
  Users,
  History,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function BookProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const bookId = params.id;

  const [book, setBook] = useState(null);
  const [meta, setMeta] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit states
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingIsbn, setEditingIsbn] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

  // Form data
  const [deadlineData, setDeadlineData] = useState({ deadline: '', severity: '' });
  const [isbnData, setIsbnData] = useState({ paperback: '', hardcover: '', ebook: '' });
  const [stageData, setStageData] = useState({ status: '', assignedToId: '', notes: '', dueDate: '', fileLink: '' });
  
  // Tiered pricing for author copies
  const [authorCopyTiers, setAuthorCopyTiers] = useState([]);
  
  // Store display overrides
  const [storeDisplay, setStoreDisplay] = useState({
    title: '',
    author: '',
    description: '',
    cover: '',
  });
  
  // Stage templates for adding new stages
  const [stageTemplates, setStageTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    fetchBook();
    fetchTeam();
    fetchStageTemplates();
  }, [bookId]);

  const fetchBook = async () => {
    try {
      const res = await fetch(`/api/admin/books/${bookId}`);
      if (!res.ok) throw new Error('Book not found');
      const data = await res.json();
      setBook(data.book);
      setMeta(data.meta);
      
      // Set initial form data
      setDeadlineData({
        deadline: data.book.deadline ? new Date(data.book.deadline).toISOString().split('T')[0] : '',
        severity: data.book.deadlineSeverity || '',
      });
      setIsbnData({
        paperback: data.book.isbnPaperback || '',
        hardcover: data.book.isbnHardcover || '',
        ebook: data.book.isbnEbook || '',
      });
      // Initialize tiers
      setAuthorCopyTiers(data.book.authorCopyTiers || [
        { minQty: 1, maxQty: 10, price: data.book.authorCopyPrice || 0 }
      ]);
      // Initialize store display overrides
      setStoreDisplay({
        title: data.book.storeDisplayTitle || '',
        author: data.book.storeDisplayAuthor || '',
        description: data.book.storeDisplayDescription || '',
        cover: data.book.storeDisplayCover || '',
      });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/admin/team');
      const data = await res.json();
      setTeam(data.team || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchStageTemplates = async () => {
    try {
      const res = await fetch('/api/admin/stage-templates');
      const data = await res.json();
      setStageTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching stage templates:', error);
    }
  };

  const handleAddStage = async () => {
    if (!selectedTemplateId) {
      toast({ title: 'Error', description: 'Please select a stage template', variant: 'destructive' });
      return;
    }

    const template = stageTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    try {
      const res = await fetch(`/api/admin/books/${bookId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageType: template.stageType,
          stageOrder: (book.publishingStages?.length || 0) + 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add stage');
      }
      toast({ title: 'Success', description: `${template.name} stage added` });
      setSelectedTemplateId('');
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveStage = async (stage) => {
    if (stage.status !== 'PENDING') {
      toast({ 
        title: 'Cannot Remove', 
        description: 'Only stages with PENDING status can be removed', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const res = await fetch(`/api/admin/books/${bookId}/stages/${stage.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove stage');
      }
      toast({ title: 'Success', description: `${formatStageName(stage.stageType)} removed` });
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateDeadline = async () => {
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadline: deadlineData.deadline || null,
          deadlineSeverity: deadlineData.severity || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update deadline');
      toast({ title: 'Success', description: 'Deadline updated' });
      setEditingDeadline(false);
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateIsbn = async () => {
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbnPaperback: isbnData.paperback || null,
          isbnHardcover: isbnData.hardcover || null,
          isbnEbook: isbnData.ebook || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update ISBN');
      toast({ title: 'Success', description: 'ISBN updated' });
      setEditingIsbn(false);
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateStage = async () => {
    if (!selectedStage) return;
    
    // Get current user from localStorage
    const userStr = localStorage.getItem('wp_user');
    const user = userStr ? JSON.parse(userStr) : null;

    try {
      const res = await fetch(`/api/admin/books/${bookId}/stages/${selectedStage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: stageData.status || undefined,
          assignedToId: stageData.assignedToId || undefined,
          notes: stageData.notes || undefined,
          dueDate: stageData.dueDate || undefined,
          fileLink: stageData.fileLink || undefined,
          changedById: user?.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      toast({ title: 'Success', description: 'Stage updated' });
      setStageDialogOpen(false);
      setSelectedStage(null);
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleStageVisibility = async (stage, newVisibility) => {
    try {
      const res = await fetch(`/api/admin/books/${bookId}/stages/${stage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVisible: newVisibility,
          // If enabling a stage that's not started, set to PENDING
          status: newVisibility && stage.status === 'PENDING' ? 'PENDING' : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update stage visibility');
      toast({ 
        title: newVisibility ? 'Stage Enabled' : 'Stage Hidden', 
        description: `${formatStageName(stage.stageType)} is now ${newVisibility ? 'visible to the author' : 'hidden'}` 
      });
      fetchBook();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openStageDialog = (stage) => {
    setSelectedStage(stage);
    setStageData({
      status: stage.status,
      assignedToId: stage.assignedToId || '',
      notes: stage.notes || '',
      dueDate: stage.dueDate ? new Date(stage.dueDate).toISOString().split('T')[0] : '',
      fileLink: stage.fileLink || '',
    });
    setStageDialogOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <PlayCircle className="h-5 w-5 text-blue-600" />;
      case 'AWAITING_APPROVAL':
        return <PauseCircle className="h-5 w-5 text-yellow-600" />;
      case 'QUERY_RAISED':
        return <MessageSquare className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
      IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
      AWAITING_APPROVAL: { label: 'Awaiting Approval', className: 'bg-yellow-100 text-yellow-700' },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
      QUERY_RAISED: { label: 'Query Raised', className: 'bg-red-100 text-red-700' },
      COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    };
    const config = map[status] || { label: status, className: 'bg-gray-100' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const map = {
      low: { label: 'Low', className: 'bg-green-100 text-green-700' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
      high: { label: 'High', className: 'bg-red-100 text-red-700' },
    };
    const config = map[severity] || { label: 'None', className: 'bg-gray-100' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatStageName = (stageType) => {
    return stageType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading book project...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Book not found</p>
        <Button className="mt-4" onClick={() => router.push('/admin/books')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Books
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/books">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{book.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {book.author?.name} ({book.author?.authorUid})
            </span>
            <span className="flex items-center gap-1">
              <Book className="h-4 w-4" />
              {book.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Progress</div>
          <div className="flex items-center gap-2">
            <Progress value={meta?.progressPercent || 0} className="w-32 h-2" />
            <span className="font-medium">{meta?.progressPercent || 0}%</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">ISBN Status</p>
                <Badge variant={meta?.isbnStatus === 'ALLOTTED' ? 'default' : 'secondary'}>
                  {meta?.isbnStatus || 'PENDING'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Current Stage</p>
                <p className="font-medium text-sm">
                  {meta?.currentStage ? formatStageName(meta.currentStage) : 'Not Started'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="font-medium text-sm">{formatDate(book.deadline)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Severity</p>
                {getSeverityBadge(book.deadlineSeverity)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Stages ({book.publishingStages?.length || 0})</TabsTrigger>
          <TabsTrigger value="store">Store Listing</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="queries">Queries ({book.queries?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Book Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Book Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Title</p>
                    <p className="font-medium">{book.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{book.category || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{book.status}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(book.createdAt)}</p>
                  </div>
                </div>
                {book.description && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Description</p>
                    <p className="text-sm">{book.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Author Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Author Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{book.author?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Author UID</p>
                    <code className="font-medium">{book.author?.authorUid}</code>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{book.author?.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{book.author?.phone || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ISBN Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">ISBN Details</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditingIsbn(true)}>
                  <Edit2 className="h-4 w-4 mr-1" /> Edit
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Paperback ISBN (Primary)</p>
                      {book.isbnPaperback ? (
                        <code className="font-medium">{book.isbnPaperback}</code>
                      ) : (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                    </div>
                    <Badge variant={book.isbnPaperback ? 'default' : 'secondary'}>
                      {book.isbnPaperback ? 'Allotted' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Hardcover ISBN</p>
                      {book.isbnHardcover ? (
                        <code className="font-medium">{book.isbnHardcover}</code>
                      ) : (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Ebook ISBN</p>
                      {book.isbnEbook ? (
                        <code className="font-medium">{book.isbnEbook}</code>
                      ) : (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                    </div>
                  </div>
                </div>
                {book.isbnPaperback && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="text-green-800">
                      <strong>ISBN Active:</strong> This book is now tracked by ISBN for all sales and royalty reporting.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deadline Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Deadline & Priority</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditingDeadline(true)}>
                  <Edit2 className="h-4 w-4 mr-1" /> Edit
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Deadline Date</p>
                    <p className="font-medium">{formatDate(book.deadline)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Severity Level</p>
                    {getSeverityBadge(book.deadlineSeverity)}
                  </div>
                </div>
                {book.deadline && new Date(book.deadline) < new Date() && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <p className="text-red-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <strong>Overdue:</strong> This project has passed its deadline.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Publishing Stages</CardTitle>
                <CardDescription>Use toggles to enable/disable stages. Click on a stage to edit details.</CardDescription>
              </div>
              <Link href="/admin/settings/stages">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" /> Manage Templates
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {/* Add Stage Section */}
              <div className="flex items-center gap-2 mb-6 p-3 bg-muted/30 rounded-lg border border-dashed">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select stage to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stageTemplates
                      .filter(t => !book.publishingStages?.some(s => s.stageType === t.stageType))
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddStage} disabled={!selectedTemplateId} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Stage
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {stageTemplates.filter(t => !book.publishingStages?.some(s => s.stageType === t.stageType)).length} templates available
                </span>
              </div>

              {/* Stages List */}
              <div className="space-y-3">
                {book.publishingStages?.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${!stage.isVisible ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'} ${stage.isLocked ? 'border-amber-300 bg-amber-50/30' : ''}`}
                  >
                    {/* Visibility Toggle */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <Switch
                        checked={stage.isVisible}
                        onCheckedChange={(checked) => handleToggleStageVisibility(stage, checked)}
                        disabled={stage.isLocked}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <span className="text-xs text-muted-foreground">
                        {stage.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>

                    {/* Status Icon */}
                    <div className="flex flex-col items-center">
                      {getStatusIcon(stage.status)}
                      {index < book.publishingStages.length - 1 && (
                        <div className="w-0.5 h-8 bg-border mt-2" />
                      )}
                    </div>

                    {/* Stage Content - Clickable */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => openStageDialog(stage)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{formatStageName(stage.stageType)}</h4>
                          {stage.isLocked && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">🔒 Locked</Badge>
                          )}
                        </div>
                        {getStatusBadge(stage.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {stage.assignedTo && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {stage.assignedTo.name}
                          </span>
                        )}
                        {stage.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {formatDate(stage.dueDate)}
                          </span>
                        )}
                        {stage.completedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed: {formatDate(stage.completedAt)}
                          </span>
                        )}
                        {stage.fileLink && (
                          <a 
                            href={stage.fileLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📎 View File
                          </a>
                        )}
                      </div>
                      {stage.notes && (
                        <p className="text-sm text-muted-foreground mt-2 truncate">{stage.notes}</p>
                      )}
                    </div>

                    {/* Remove Stage Button */}
                    <div className="flex flex-col items-center pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStage(stage);
                        }}
                        disabled={stage.status !== 'PENDING' || stage.isLocked}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        title={stage.status !== 'PENDING' ? 'Only PENDING stages can be removed' : 'Remove stage'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Listing Tab */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Visibility & Pricing</CardTitle>
              <CardDescription>Configure how this book appears in the store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visibility Controls */}
              <div className="space-y-4">
                <h4 className="font-medium">Visibility</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Public Listing</p>
                      <p className="text-sm text-muted-foreground">Show this book in the public store</p>
                    </div>
                    <Switch
                      checked={book.isPublic}
                      onCheckedChange={async (checked) => {
                        try {
                          const res = await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isPublic: checked }),
                          });
                          if (!res.ok) throw new Error('Failed to update');
                          toast({ title: 'Updated', description: checked ? 'Book is now public' : 'Book is now hidden' });
                          fetchBook();
                        } catch (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Author Copy Only</p>
                      <p className="text-sm text-muted-foreground">Only available for author purchase</p>
                    </div>
                    <Switch
                      checked={book.isAuthorCopy}
                      onCheckedChange={async (checked) => {
                        try {
                          const res = await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isAuthorCopy: checked }),
                          });
                          if (!res.ok) throw new Error('Failed to update');
                          toast({ title: 'Updated', description: checked ? 'Author copy only enabled' : 'Public sale enabled' });
                          fetchBook();
                        } catch (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Format Availability - ALL TOGGLEABLE */}
              <div className="space-y-4">
                <h4 className="font-medium">Available Formats</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Paperback</span>
                    <Switch
                      checked={book.hasPaperback !== false}
                      onCheckedChange={async (checked) => {
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hasPaperback: checked }),
                          });
                          fetchBook();
                        } catch (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Hardcover</span>
                    <Switch
                      checked={book.hasHardcover}
                      onCheckedChange={async (checked) => {
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hasHardcover: checked }),
                          });
                          fetchBook();
                        } catch (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Ebook</span>
                    <Switch
                      checked={book.hasEbook}
                      onCheckedChange={async (checked) => {
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hasEbook: checked }),
                          });
                          fetchBook();
                        } catch (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h4 className="font-medium">Pricing</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Paperback Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      defaultValue={book.paperbackPrice || book.price || ''}
                      onBlur={async (e) => {
                        const value = e.target.value;
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              paperbackPrice: parseFloat(value) || null,
                              price: parseFloat(value) || 0,
                            }),
                          });
                          fetchBook();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hardcover Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      defaultValue={book.hardcoverPrice || ''}
                      disabled={!book.hasHardcover}
                      onBlur={async (e) => {
                        const value = e.target.value;
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hardcoverPrice: parseFloat(value) || null }),
                          });
                          fetchBook();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ebook Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      defaultValue={book.ebookPrice || ''}
                      disabled={!book.hasEbook}
                      onBlur={async (e) => {
                        const value = e.target.value;
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ebookPrice: parseFloat(value) || null }),
                          });
                          fetchBook();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Optional discount price"
                      defaultValue={book.discountPrice || ''}
                      onBlur={async (e) => {
                        const value = e.target.value;
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ discountPrice: parseFloat(value) || null }),
                          });
                          fetchBook();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Author Copy Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Special price for author"
                      defaultValue={book.authorCopyPrice || ''}
                      onBlur={async (e) => {
                        const value = e.target.value;
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ authorCopyPrice: parseFloat(value) || null }),
                          });
                          fetchBook();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Author Copy Settings */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Author Copy Settings</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Order Quantity (MOQ)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      defaultValue={book.authorCopyMOQ || 1}
                      onBlur={async (e) => {
                        const value = e.target.value;
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ authorCopyMOQ: parseInt(value) || 1 }),
                          });
                          fetchBook();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Minimum copies an author must order</p>
                  </div>
                </div>
                
                {/* Multiple Tiered Pricing */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Tiered Pricing (Author Copies)</Label>
                      <p className="text-xs text-muted-foreground">Set volume discounts for author copy orders</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const lastTier = authorCopyTiers[authorCopyTiers.length - 1];
                        const newTier = {
                          minQty: (lastTier?.maxQty || 0) + 1,
                          maxQty: (lastTier?.maxQty || 0) + 50,
                          price: lastTier?.price || book.authorCopyPrice || 0
                        };
                        setAuthorCopyTiers([...authorCopyTiers, newTier]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Tier
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 space-y-3">
                    {authorCopyTiers.map((tier, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                        <div>
                          <Label className="text-xs">Min Qty</Label>
                          <Input
                            type="number"
                            value={tier.minQty}
                            onChange={(e) => {
                              const updated = [...authorCopyTiers];
                              updated[idx].minQty = parseInt(e.target.value) || 1;
                              setAuthorCopyTiers(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Qty</Label>
                          <Input
                            type="number"
                            value={tier.maxQty || ''}
                            placeholder="∞"
                            onChange={(e) => {
                              const updated = [...authorCopyTiers];
                              updated[idx].maxQty = parseInt(e.target.value) || null;
                              setAuthorCopyTiers(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price/Unit (₹)</Label>
                          <Input
                            type="number"
                            value={tier.price}
                            onChange={(e) => {
                              const updated = [...authorCopyTiers];
                              updated[idx].price = parseFloat(e.target.value) || 0;
                              setAuthorCopyTiers(updated);
                            }}
                          />
                        </div>
                        <div className="text-center text-xs text-muted-foreground pb-2">
                          Tier {idx + 1}
                        </div>
                        <div>
                          {idx > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAuthorCopyTiers(authorCopyTiers.filter((_, i) => i !== idx));
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      className="w-full mt-2"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await fetch(`/api/admin/books/${bookId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ authorCopyTiers }),
                          });
                          toast({ title: 'Saved', description: 'Tiered pricing updated' });
                          fetchBook();
                        } catch (error) {
                          toast({ title: 'Error', description: 'Failed to save tiers', variant: 'destructive' });
                        }
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" /> Save Tiers
                    </Button>
                  </div>
                </div>
              </div>

              {/* Store Display Overrides */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Store Display Overrides</h4>
                <p className="text-xs text-muted-foreground">Override how this book appears on the public store (does not change actual book data)</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Title</Label>
                    <Input
                      placeholder={book.title || 'Original title'}
                      value={storeDisplay.title}
                      onChange={(e) => setStoreDisplay({ ...storeDisplay, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Author Name(s)</Label>
                    <Input
                      placeholder={book.author?.name || 'Original author'}
                      value={storeDisplay.author}
                      onChange={(e) => setStoreDisplay({ ...storeDisplay, author: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Display Description</Label>
                  <Textarea
                    placeholder="Marketing-friendly description for store"
                    rows={3}
                    value={storeDisplay.description}
                    onChange={(e) => setStoreDisplay({ ...storeDisplay, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <Input
                    placeholder="https://... (upload elsewhere and paste URL)"
                    value={storeDisplay.cover}
                    onChange={(e) => setStoreDisplay({ ...storeDisplay, cover: e.target.value })}
                  />
                  {storeDisplay.cover && (
                    <div className="mt-2">
                      <img src={storeDisplay.cover} alt="Cover preview" className="h-32 object-cover rounded border" />
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await fetch(`/api/admin/books/${bookId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          storeDisplayTitle: storeDisplay.title || null,
                          storeDisplayAuthor: storeDisplay.author || null,
                          storeDisplayDescription: storeDisplay.description || null,
                          storeDisplayCover: storeDisplay.cover || null,
                        }),
                      });
                      toast({ title: 'Saved', description: 'Store display settings updated' });
                      fetchBook();
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" /> Save Display Settings
                </Button>
              </div>

              {/* Shipping */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Shipping</p>
                  <p className="text-sm text-muted-foreground">Allow physical delivery of this book</p>
                </div>
                <Switch
                  checked={book.shippingEnabled}
                  onCheckedChange={async (checked) => {
                    try {
                      const res = await fetch(`/api/admin/books/${bookId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ shippingEnabled: checked }),
                      });
                      if (!res.ok) throw new Error('Failed to update');
                      fetchBook();
                    } catch (error) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    }
                  }}
                />
              </div>

              {/* Word Upload Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Allow Word Document Upload</p>
                  <p className="text-sm text-muted-foreground">Let author upload Word files instead of using formatter</p>
                </div>
                <Switch
                  checked={book.allowWordUpload}
                  onCheckedChange={async (checked) => {
                    try {
                      const res = await fetch(`/api/admin/books/${bookId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ allowWordUpload: checked }),
                      });
                      if (!res.ok) throw new Error('Failed to update');
                      fetchBook();
                    } catch (error) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    }
                  }}
                />
              </div>

              {/* Manuscript Downloads */}
              {book.manuscripts?.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Manuscript Downloads</h4>
                  {book.manuscripts.map((ms) => (
                    <div key={ms.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{ms.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {ms.isWordUpload ? 'Word Upload' : 'Formatter'} • {ms.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {ms.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={ms.fileUrl} download={ms.fileName}>
                              <Download className="h-4 w-4 mr-1" /> Original
                            </a>
                          </Button>
                        )}
                        {ms.content && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(ms.content, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${ms.fileName}-content.json`;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" /> Content
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Assignments</CardTitle>
              <CardDescription>Team members assigned to different stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {book.publishingStages?.filter(s => s.assignedTo).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No team members assigned yet</p>
                    <p className="text-sm mt-1">Click on a stage to assign team members</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {book.publishingStages?.filter(s => s.assignedTo).map(stage => (
                      <div key={stage.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{stage.assignedTo.name}</p>
                          <p className="text-sm text-muted-foreground">{formatStageName(stage.stageType)}</p>
                        </div>
                        {getStatusBadge(stage.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Related Queries</CardTitle>
              <CardDescription>Questions and issues raised for this book</CardDescription>
            </CardHeader>
            <CardContent>
              {book.queries?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No queries raised yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {book.queries?.map(query => (
                    <div key={query.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{query.title}</h4>
                        <Badge variant={query.status === 'OPEN' ? 'destructive' : 'secondary'}>
                          {query.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{query.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>By: {query.author?.name}</span>
                        <span>Created: {formatDate(query.createdAt)}</span>
                        {query.assignedTo && <span>Assigned: {query.assignedTo.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Deadline Dialog */}
      <Dialog open={editingDeadline} onOpenChange={setEditingDeadline}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Deadline Date</Label>
              <Input
                type="date"
                value={deadlineData.deadline}
                onChange={(e) => setDeadlineData({ ...deadlineData, deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity Level</Label>
              <Select
                value={deadlineData.severity || 'none'}
                onValueChange={(v) => setDeadlineData({ ...deadlineData, severity: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDeadline(false)}>Cancel</Button>
            <Button onClick={handleUpdateDeadline}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit ISBN Dialog */}
      <Dialog open={editingIsbn} onOpenChange={setEditingIsbn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ISBN</DialogTitle>
            <DialogDescription>
              Once ISBN is assigned, it becomes the primary key for tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paperback ISBN (Primary)</Label>
              <Input
                placeholder="978-X-XXX-XXXXX-X"
                value={isbnData.paperback}
                onChange={(e) => setIsbnData({ ...isbnData, paperback: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hardcover ISBN</Label>
              <Input
                placeholder="978-X-XXX-XXXXX-X"
                value={isbnData.hardcover}
                onChange={(e) => setIsbnData({ ...isbnData, hardcover: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ebook ISBN (Optional)</Label>
              <Input
                placeholder="978-X-XXX-XXXXX-X"
                value={isbnData.ebook}
                onChange={(e) => setIsbnData({ ...isbnData, ebook: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIsbn(false)}>Cancel</Button>
            <Button onClick={handleUpdateIsbn}>Save ISBN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedStage ? formatStageName(selectedStage.stageType) : 'Edit Stage'}
            </DialogTitle>
            {selectedStage?.isLocked && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded mt-2">
                🔒 This stage is locked (approved by author)
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={stageData.status || 'PENDING'}
                onValueChange={(v) => setStageData({ ...stageData, status: v })}
                disabled={selectedStage?.isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="QUERY_RAISED">Query Raised</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={stageData.assignedToId || 'unassigned'}
                onValueChange={(v) => setStageData({ ...stageData, assignedToId: v === 'unassigned' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {team.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File Link (Drive, Dropbox, etc.)</Label>
              <Input
                placeholder="https://drive.google.com/..."
                value={stageData.fileLink}
                onChange={(e) => setStageData({ ...stageData, fileLink: e.target.value })}
                disabled={selectedStage?.isLocked}
              />
              <p className="text-xs text-muted-foreground">
                Add a link to the file for author review
              </p>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={stageData.dueDate}
                onChange={(e) => setStageData({ ...stageData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this stage..."
                value={stageData.notes}
                onChange={(e) => setStageData({ ...stageData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStage} disabled={selectedStage?.isLocked}>
              Update Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
