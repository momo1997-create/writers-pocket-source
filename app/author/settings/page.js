'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Globe,
  Save,
  Bell,
  Shield,
  Palette,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Link as LinkIcon,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AuthorSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    alternateEmail: '',
    alternatePhone: '',
    bio: '',
    website: '',
    publicUrl: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      facebook: '',
      linkedin: '',
      youtube: '',
    },
  });

  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    branchName: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    stageUpdates: true,
    queryResponses: true,
    royaltyAlerts: true,
    marketingEmails: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/author/settings');
      const data = await res.json();
      if (data.profile) {
        setProfile({
          ...profile,
          ...data.profile,
          socialLinks: data.profile.socialLinks || profile.socialLinks,
        });
      }
      if (data.bankDetails) {
        setBankDetails(data.bankDetails);
      }
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/author/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      toast({ title: 'Saved', description: 'Profile updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/author/settings/bank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankDetails),
      });
      if (!res.ok) throw new Error('Failed to save bank details');
      toast({ title: 'Saved', description: 'Bank details updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/author/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      });
      if (!res.ok) throw new Error('Failed to save notification preferences');
      toast({ title: 'Saved', description: 'Notification preferences updated' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Bank Details
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alternate Email</Label>
                  <Input
                    type="email"
                    value={profile.alternateEmail || ''}
                    onChange={(e) => setProfile({ ...profile, alternateEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell readers about yourself..."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={profile.website || ''}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Public Profile URL</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/author/</span>
                    <Input
                      value={profile.publicUrl || ''}
                      onChange={(e) => setProfile({ ...profile, publicUrl: e.target.value })}
                      placeholder="your-name"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" /> Instagram
                  </Label>
                  <Input
                    value={profile.socialLinks?.instagram || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4" /> Twitter / X
                  </Label>
                  <Input
                    value={profile.socialLinks?.twitter || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="https://twitter.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4" /> Facebook
                  </Label>
                  <Input
                    value={profile.socialLinks?.facebook || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </Label>
                  <Input
                    value={profile.socialLinks?.linkedin || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </TabsContent>

        {/* Bank Details Tab */}
        <TabsContent value="bank" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Details</CardTitle>
              <CardDescription>For royalty payments. All information is encrypted and secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input
                    value={bankDetails.branchName || ''}
                    onChange={(e) => setBankDetails({ ...bankDetails, branchName: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveBankDetails} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what emails you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Stage Updates</p>
                  <p className="text-sm text-muted-foreground">Get notified when your book moves to a new stage</p>
                </div>
                <Switch
                  checked={notifications.stageUpdates}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, stageUpdates: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Query Responses</p>
                  <p className="text-sm text-muted-foreground">Receive notifications for query replies</p>
                </div>
                <Switch
                  checked={notifications.queryResponses}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, queryResponses: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Royalty Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified about royalty payments and reports</p>
                </div>
                <Switch
                  checked={notifications.royaltyAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, royaltyAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">Promotional updates and writing tips</p>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
