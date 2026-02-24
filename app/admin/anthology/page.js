'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  Eye,
  Search,
  Calendar,
  Mail,
  Phone,
  Instagram,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function AdminAnthologyPage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [submissionsRes, statsRes] = await Promise.all([
        fetch('/api/admin/anthology'),
        fetch('/api/anthology/stats'),
      ]);

      const submissionsData = await submissionsRes.json();
      const statsData = await statsRes.json();

      setSubmissions(submissionsData.submissions || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submission) => {
    setSelectedSubmission(submission);
    setDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Instagram', 'Title', 'Submitted At'];
    const rows = submissions.map((s) => [
      s.name,
      s.email,
      s.phone,
      s.instagramUsername || '',
      s.poetryTitle,
      new Date(s.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anthology-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'CSV file downloaded' });
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.poetryTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Anthology Submissions</h1>
          <p className="text-muted-foreground mt-1">Review and manage anthology entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.today}</div>
            <p className="text-sm text-muted-foreground">Last 24 Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {submissions.filter((s) => s.googleSheetSynced).length}
            </div>
            <p className="text-sm text-muted-foreground">Synced to Sheets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {submissions.filter((s) => !s.googleSheetSynced).length}
            </div>
            <p className="text-sm text-muted-foreground">Pending Sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or title..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Submissions ({filteredSubmissions.length})
          </CardTitle>
          <CardDescription>Click on a submission to view full details</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Submitter</th>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Contact Pref</th>
                    <th className="text-left p-4 font-medium">Submitted</th>
                    <th className="text-left p-4 font-medium">Synced</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <div className="font-medium">{submission.name}</div>
                        <div className="text-sm text-muted-foreground">{submission.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs truncate">{submission.poetryTitle}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="capitalize">
                          {submission.contactPreference === 'email' ? (
                            <><Mail className="h-3 w-3 mr-1" /> Email</>
                          ) : (
                            <><Instagram className="h-3 w-3 mr-1" /> Instagram</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(submission.createdAt)}
                      </td>
                      <td className="p-4">
                        {submission.googleSheetSynced ? (
                          <Badge variant="default" className="text-xs">Synced</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSubmission(submission)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
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

      {/* View Submission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.poetryTitle}</DialogTitle>
            <DialogDescription>
              Submitted by {selectedSubmission?.name} on {selectedSubmission && formatDate(selectedSubmission.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> {selectedSubmission.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {selectedSubmission.phone}
                    {selectedSubmission.isWhatsApp && <Badge variant="outline" className="text-xs">WhatsApp</Badge>}
                  </p>
                </div>
                {selectedSubmission.instagramUsername && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Instagram</p>
                    <p className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> {selectedSubmission.instagramUsername}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Preference</p>
                  <Badge className="capitalize">{selectedSubmission.contactPreference}</Badge>
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Submission Content</p>
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {selectedSubmission.poetryContent}
                </div>
              </div>

              {/* Bio */}
              {selectedSubmission.bio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Author Bio</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.bio}</p>
                </div>
              )}

              {/* Sync Status */}
              <div className="border-t pt-4">
                <p className="text-sm">
                  <span className="font-medium">Google Sheets Status: </span>
                  {selectedSubmission.googleSheetSynced ? (
                    <Badge variant="default">Synced</Badge>
                  ) : (
                    <Badge variant="secondary">Pending Sync</Badge>
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
