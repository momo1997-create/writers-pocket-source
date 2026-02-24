'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  User,
  History,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Default stages - admin can customize
const DEFAULT_STAGES = [
  { id: 'NEW', name: 'New', color: 'blue' },
  { id: 'CONTACTED', name: 'Contacted', color: 'yellow' },
  { id: 'INTERESTED', name: 'Interested', color: 'green' },
  { id: 'NEGOTIATING', name: 'Negotiating', color: 'purple' },
  { id: 'CONVERTED', name: 'Converted', color: 'emerald' },
  { id: 'LOST', name: 'Lost', color: 'red' },
];

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [team, setTeam] = useState([]);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Form data for new/edit lead
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alternateEmail: '',
    alternatePhone: '',
    source: 'WEBSITE',
    interestArea: '',
    contractAmount: '',
    deadline: '',
    deadlineSeverity: 'MEDIUM',
    assignedToId: '',
    stage: 'NEW',
    notes: '',
  });
  
  // Note input for adding notes
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leadsRes, teamRes, stagesRes] = await Promise.all([
        fetch('/api/admin/leads'),
        fetch('/api/admin/team'),
        fetch('/api/admin/lead-stages'),
      ]);
      
      const leadsData = await leadsRes.json();
      const teamData = await teamRes.json();
      const stagesData = await stagesRes.json();
      
      setLeads(leadsData.leads || []);
      setTeam(teamData.team || []);
      if (stagesData.stages?.length > 0) {
        setStages(stagesData.stages);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: 'Error', description: 'Name and email are required', variant: 'destructive' });
      return;
    }

    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contractAmount: formData.contractAmount ? parseFloat(formData.contractAmount) : null,
          createdById: user?.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create lead');
      }

      toast({ title: 'Success', description: 'Lead created successfully' });
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateLead = async (updates) => {
    if (!selectedLead) return;

    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update lead');

      toast({ title: 'Updated', description: 'Lead updated successfully' });
      fetchData();
      
      // Refresh selected lead
      const updated = await res.json();
      setSelectedLead(updated.lead);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;

    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch(`/api/admin/leads/${selectedLead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote,
          createdById: user?.id,
          createdByName: user?.name || 'Admin',
        }),
      });

      if (!res.ok) throw new Error('Failed to add note');

      toast({ title: 'Note Added' });
      setNewNote('');
      fetchData();
      
      // Refresh selected lead
      const leadsRes = await fetch('/api/admin/leads');
      const leadsData = await leadsRes.json();
      const updatedLead = leadsData.leads?.find(l => l.id === selectedLead.id);
      if (updatedLead) setSelectedLead(updatedLead);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      alternateEmail: '',
      alternatePhone: '',
      source: 'WEBSITE',
      interestArea: '',
      contractAmount: '',
      deadline: '',
      deadlineSeverity: 'MEDIUM',
      assignedToId: '',
      stage: 'NEW',
      notes: '',
    });
  };

  const openLeadDetail = (lead) => {
    setSelectedLead(lead);
    setDetailSheetOpen(true);
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    // Status filter (clickable cards)
    if (statusFilter !== 'all' && lead.stage !== statusFilter) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !lead.name?.toLowerCase().includes(query) &&
        !lead.email?.toLowerCase().includes(query) &&
        !lead.phone?.includes(query)
      ) return false;
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const leadDate = new Date(lead.createdAt);
      const today = new Date();
      if (dateFilter === 'today') {
        if (leadDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        if (leadDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
        if (leadDate < monthAgo) return false;
      }
    }
    
    return true;
  });

  // Summary counts
  const statusCounts = {
    total: leads.length,
    new: leads.filter(l => l.stage === 'NEW').length,
    interested: leads.filter(l => l.stage === 'INTERESTED').length,
    converted: leads.filter(l => l.stage === 'CONVERTED').length,
    lost: leads.filter(l => l.stage === 'LOST').length,
  };

  const getStatusBadge = (stage) => {
    const colorMap = {
      NEW: 'bg-blue-100 text-blue-700',
      CONTACTED: 'bg-yellow-100 text-yellow-700',
      INTERESTED: 'bg-green-100 text-green-700',
      NEGOTIATING: 'bg-purple-100 text-purple-700',
      CONVERTED: 'bg-emerald-100 text-emerald-700',
      LOST: 'bg-red-100 text-red-700',
    };
    return <Badge className={colorMap[stage] || 'bg-gray-100'}>{stage?.replace('_', ' ')}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const map = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700 animate-pulse',
    };
    return <Badge className={map[severity] || map.MEDIUM}>{severity}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">CRM / Leads</h1>
          <p className="text-muted-foreground mt-1">Manage leads and track conversions</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Lead
        </Button>
      </div>

      {/* Summary Cards - CLICKABLE */}
      <div className="grid grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="text-2xl font-bold">{statusCounts.total}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'NEW' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'all' : 'NEW')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{statusCounts.new}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">New</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'INTERESTED' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'INTERESTED' ? 'all' : 'INTERESTED')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{statusCounts.interested}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Interested</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'CONVERTED' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'CONVERTED' ? 'all' : 'CONVERTED')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-600">{statusCounts.converted}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Converted</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'LOST' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'LOST' ? 'all' : 'LOST')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{statusCounts.lost}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Lost</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            {statusFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Lead</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Stage</th>
                  <th className="text-left p-4 font-medium">Contract</th>
                  <th className="text-left p-4 font-medium">Deadline</th>
                  <th className="text-left p-4 font-medium">Assigned To</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No leads found. Click "Add New Lead" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => openLeadDetail(lead)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.source}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(lead.stage)}</td>
                      <td className="p-4">
                        {lead.contractAmount ? (
                          <span className="font-medium">₹{lead.contractAmount.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {lead.deadline ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{new Date(lead.deadline).toLocaleDateString()}</span>
                            {lead.deadlineSeverity && getSeverityBadge(lead.deadlineSeverity)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="text-sm">{lead.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openLeadDetail(lead); }}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter lead details to add to CRM</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Phone</Label>
                <Input
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Alternate Email</Label>
                <Input
                  type="email"
                  value={formData.alternateEmail}
                  onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Lead Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="REFERRAL">Referral</SelectItem>
                    <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                    <SelectItem value="ADVERTISEMENT">Advertisement</SelectItem>
                    <SelectItem value="EVENT">Event</SelectItem>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interest Area</Label>
                <Input
                  value={formData.interestArea}
                  onChange={(e) => setFormData({ ...formData, interestArea: e.target.value })}
                  placeholder="e.g., Poetry Book, Novel"
                />
              </div>
              <div className="space-y-2">
                <Label>Contract Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.contractAmount}
                  onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={formData.assignedToId || 'none'} onValueChange={(v) => setFormData({ ...formData, assignedToId: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {team.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline Severity</Label>
                <Select value={formData.deadlineSeverity} onValueChange={(v) => setFormData({ ...formData, deadlineSeverity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Initial Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any initial notes about this lead..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLead}>Create Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>{selectedLead.name}</span>
                  {getStatusBadge(selectedLead.stage)}
                </SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="notes">Notes ({selectedLead.notes?.length || 0})</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Stage</Label>
                      <Select 
                        value={selectedLead.stage} 
                        onValueChange={(v) => handleUpdateLead({ stage: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(stage => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{selectedLead.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p>{selectedLead.phone || '-'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Contract Amount (₹)</Label>
                      <Input
                        type="number"
                        value={selectedLead.contractAmount || ''}
                        onChange={(e) => handleUpdateLead({ contractAmount: parseFloat(e.target.value) || null })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Deadline</Label>
                        <Input
                          type="date"
                          value={selectedLead.deadline ? selectedLead.deadline.split('T')[0] : ''}
                          onChange={(e) => handleUpdateLead({ deadline: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select 
                          value={selectedLead.deadlineSeverity || 'MEDIUM'} 
                          onValueChange={(v) => handleUpdateLead({ deadlineSeverity: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Assigned To</Label>
                      <Select 
                        value={selectedLead.assignedToId || 'none'} 
                        onValueChange={(v) => handleUpdateLead({ assignedToId: v === 'none' ? null : v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {team.map(member => (
                            <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                      Add
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {selectedLead.notes?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No notes yet</p>
                    ) : (
                      selectedLead.notes?.map((note, i) => (
                        <Card key={i}>
                          <CardContent className="p-3">
                            <p className="text-sm">{note.content}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>{note.createdByName}</span>
                              <span>{new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {selectedLead.stageHistory?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No stage changes yet</p>
                    ) : (
                      selectedLead.stageHistory?.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">{entry.fromStage || 'New'}</span>
                              {' → '}
                              <span className="font-medium">{entry.toStage}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.changedByName} • {new Date(entry.changedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
