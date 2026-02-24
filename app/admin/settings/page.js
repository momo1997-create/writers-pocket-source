'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Save,
  Clock,
  Percent,
  Home,
  BookOpen,
  PenTool,
  MessageSquare,
  Upload,
  Image,
  Bell,
  List,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Homepage settings
  const [homepageSettings, setHomepageSettings] = useState({
    showRecentReleases: true,
    showBestSellers: true,
    bestSellersMode: 'auto',
    showLiveCounter: true,
    recentReleasesCount: 8,
    bestSellersCount: 8,
  });

  // Free Publishing settings - ENHANCED
  const [freePublishingSettings, setFreePublishingSettings] = useState({
    basePrice: 999,
    discountPrice: '', // Can be blank/null
    showDiscount: false,
    whatsappEnabled: true,
    whatsappNumber: '+919876543210',
    chatbotEnabled: false,
    chatbotUrl: '',
    ctaButtonText: 'Start Publishing',
    ctaDescription: 'Get your book published for free with our expert guidance',
  });

  // Writing Challenge settings - ENHANCED
  const [writingChallengeSettings, setWritingChallengeSettings] = useState({
    basePrice: 1999,
    discountPrice: '', // Can be blank/null
    showDiscount: false,
    whatsappEnabled: true,
    whatsappNumber: '+919876543210',
    chatbotEnabled: false,
    chatbotUrl: '',
    ctaButtonText: 'Join Challenge',
    ctaDescription: 'Transform your writing with our 45-day challenge',
    durationDays: 45,
    minSubmissions: 30,
    promptsCount: 50,
  });

  // Branding settings
  const [brandingSettings, setBrandingSettings] = useState({
    logoUrl: '',
    siteName: "Writer's Pocket",
    tagline: 'Your Publishing Partner',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/site-settings');
      const data = await res.json();
      
      if (data.settings) {
        const s = data.settings;
        
        // Homepage
        if (s.homepage) {
          setHomepageSettings({
            showRecentReleases: s.homepage.showRecentReleases ?? true,
            showBestSellers: s.homepage.showBestSellers ?? true,
            bestSellersMode: s.homepage.bestSellersMode ?? 'auto',
            showLiveCounter: s.homepage.showLiveCounter ?? true,
            recentReleasesCount: s.homepage.recentReleasesCount ?? 8,
            bestSellersCount: s.homepage.bestSellersCount ?? 8,
          });
        }
        
        // Free Publishing
        if (s.freePublishing) {
          setFreePublishingSettings({
            basePrice: s.freePublishing.basePrice ?? 999,
            discountPrice: s.freePublishing.discountPrice ?? '',
            showDiscount: s.freePublishing.showDiscount ?? false,
            whatsappEnabled: s.freePublishing.whatsappEnabled ?? true,
            whatsappNumber: s.freePublishing.whatsappNumber ?? '+919876543210',
            chatbotEnabled: s.freePublishing.chatbotEnabled ?? false,
            chatbotUrl: s.freePublishing.chatbotUrl ?? '',
            ctaButtonText: s.freePublishing.ctaButtonText ?? 'Start Publishing',
            ctaDescription: s.freePublishing.ctaDescription ?? '',
          });
        }
        
        // Writing Challenge
        if (s.writingChallenge) {
          setWritingChallengeSettings({
            basePrice: s.writingChallenge.basePrice ?? 1999,
            discountPrice: s.writingChallenge.discountPrice ?? '',
            showDiscount: s.writingChallenge.showDiscount ?? false,
            whatsappEnabled: s.writingChallenge.whatsappEnabled ?? true,
            whatsappNumber: s.writingChallenge.whatsappNumber ?? '+919876543210',
            chatbotEnabled: s.writingChallenge.chatbotEnabled ?? false,
            chatbotUrl: s.writingChallenge.chatbotUrl ?? '',
            ctaButtonText: s.writingChallenge.ctaButtonText ?? 'Join Challenge',
            ctaDescription: s.writingChallenge.ctaDescription ?? '',
            durationDays: s.writingChallenge.durationDays ?? 45,
            minSubmissions: s.writingChallenge.minSubmissions ?? 30,
            promptsCount: s.writingChallenge.promptsCount ?? 50,
          });
        }
        
        // Branding
        if (s.branding) {
          setBrandingSettings({
            logoUrl: s.branding.logoUrl ?? '',
            siteName: s.branding.siteName ?? "Writer's Pocket",
            tagline: s.branding.tagline ?? 'Your Publishing Partner',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category) => {
    setSaving(true);
    try {
      let settingsData = {};
      
      if (category === 'homepage') {
        settingsData = { homepage: homepageSettings };
      } else if (category === 'freePublishing') {
        settingsData = { freePublishing: freePublishingSettings };
      } else if (category === 'writingChallenge') {
        settingsData = { writingChallenge: writingChallengeSettings };
      } else if (category === 'branding') {
        settingsData = { branding: brandingSettings };
      }

      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      toast({ title: 'Success', description: 'Settings saved and will reflect on frontend immediately' });
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
        <h1 className="text-2xl md:text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure homepage, pricing, support channels, and branding
        </p>
      </div>

      {/* Quick Links */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Quick Links:</span>
            <Link href="/admin/settings/stages">
              <Button variant="outline" size="sm">
                <List className="h-4 w-4 mr-2" /> Manage Stage Templates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="homepage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="homepage">
            <Home className="h-4 w-4 mr-2" /> Homepage
          </TabsTrigger>
          <TabsTrigger value="free-publishing">
            <BookOpen className="h-4 w-4 mr-2" /> Free Publishing
          </TabsTrigger>
          <TabsTrigger value="writing-challenge">
            <PenTool className="h-4 w-4 mr-2" /> Challenge
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Image className="h-4 w-4 mr-2" /> Branding
          </TabsTrigger>
        </TabsList>

        {/* Homepage Settings */}
        <TabsContent value="homepage">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Settings</CardTitle>
              <CardDescription>Control homepage sections and display options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recent Releases Section</Label>
                      <p className="text-sm text-muted-foreground">Show recently published books</p>
                    </div>
                    <Switch
                      checked={homepageSettings.showRecentReleases}
                      onCheckedChange={(checked) =>
                        setHomepageSettings({ ...homepageSettings, showRecentReleases: checked })
                      }
                    />
                  </div>
                  {homepageSettings.showRecentReleases && (
                    <div className="flex items-center gap-4">
                      <Label>Count:</Label>
                      <Input
                        type="number"
                        min="4"
                        max="16"
                        className="w-20"
                        value={homepageSettings.recentReleasesCount}
                        onChange={(e) =>
                          setHomepageSettings({ ...homepageSettings, recentReleasesCount: parseInt(e.target.value) || 8 })
                        }
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Best Sellers Section</Label>
                      <p className="text-sm text-muted-foreground">Show top selling books</p>
                    </div>
                    <Switch
                      checked={homepageSettings.showBestSellers}
                      onCheckedChange={(checked) =>
                        setHomepageSettings({ ...homepageSettings, showBestSellers: checked })
                      }
                    />
                  </div>
                  {homepageSettings.showBestSellers && (
                    <div className="space-y-2">
                      <Label>Mode:</Label>
                      <Select
                        value={homepageSettings.bestSellersMode}
                        onValueChange={(v) => setHomepageSettings({ ...homepageSettings, bestSellersMode: v })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (by sales)</SelectItem>
                          <SelectItem value="manual">Manual Selection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Live Counter</Label>
                    <p className="text-sm text-muted-foreground">Show books/authors count</p>
                  </div>
                  <Switch
                    checked={homepageSettings.showLiveCounter}
                    onCheckedChange={(checked) =>
                      setHomepageSettings({ ...homepageSettings, showLiveCounter: checked })
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => saveSettings('homepage')} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Homepage Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Free Publishing Settings */}
        <TabsContent value="free-publishing">
          <Card>
            <CardHeader>
              <CardTitle>Free Publishing Settings</CardTitle>
              <CardDescription>Configure pricing, discounts, and support options for free publishing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Pricing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Base Price (₹) *</Label>
                    <Input
                      type="number"
                      value={freePublishingSettings.basePrice}
                      onChange={(e) =>
                        setFreePublishingSettings({ ...freePublishingSettings, basePrice: parseInt(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">This is the main price shown</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Leave blank for no discount"
                      value={freePublishingSettings.discountPrice}
                      onChange={(e) =>
                        setFreePublishingSettings({ ...freePublishingSettings, discountPrice: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Optional - leave blank to hide</p>
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={freePublishingSettings.showDiscount}
                        onCheckedChange={(checked) =>
                          setFreePublishingSettings({ ...freePublishingSettings, showDiscount: checked })
                        }
                        disabled={!freePublishingSettings.discountPrice}
                      />
                      <Label>Show strikethrough discount</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Call to Action</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA Button Text</Label>
                    <Input
                      value={freePublishingSettings.ctaButtonText}
                      onChange={(e) =>
                        setFreePublishingSettings({ ...freePublishingSettings, ctaButtonText: e.target.value })
                      }
                      placeholder="Start Publishing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Description</Label>
                    <Input
                      value={freePublishingSettings.ctaDescription}
                      onChange={(e) =>
                        setFreePublishingSettings({ ...freePublishingSettings, ctaDescription: e.target.value })
                      }
                      placeholder="Brief description below button"
                    />
                  </div>
                </div>
              </div>

              {/* Support Channels */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Support Channels</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* WhatsApp */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <Label>WhatsApp Support</Label>
                      </div>
                      <Switch
                        checked={freePublishingSettings.whatsappEnabled}
                        onCheckedChange={(checked) =>
                          setFreePublishingSettings({ ...freePublishingSettings, whatsappEnabled: checked })
                        }
                      />
                    </div>
                    {freePublishingSettings.whatsappEnabled && (
                      <Input
                        value={freePublishingSettings.whatsappNumber}
                        onChange={(e) =>
                          setFreePublishingSettings({ ...freePublishingSettings, whatsappNumber: e.target.value })
                        }
                        placeholder="+919876543210"
                      />
                    )}
                  </div>

                  {/* Chatbot */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-600" />
                        <Label>Chatbot</Label>
                      </div>
                      <Switch
                        checked={freePublishingSettings.chatbotEnabled}
                        onCheckedChange={(checked) =>
                          setFreePublishingSettings({ ...freePublishingSettings, chatbotEnabled: checked })
                        }
                      />
                    </div>
                    {freePublishingSettings.chatbotEnabled && (
                      <Input
                        value={freePublishingSettings.chatbotUrl}
                        onChange={(e) =>
                          setFreePublishingSettings({ ...freePublishingSettings, chatbotUrl: e.target.value })
                        }
                        placeholder="https://tawk.to/your-widget-url"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => saveSettings('freePublishing')} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Free Publishing Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Writing Challenge Settings */}
        <TabsContent value="writing-challenge">
          <Card>
            <CardHeader>
              <CardTitle>Writing Challenge Settings</CardTitle>
              <CardDescription>Configure pricing, duration, and support options for writing challenge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Pricing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Base Price (₹) *</Label>
                    <Input
                      type="number"
                      value={writingChallengeSettings.basePrice}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, basePrice: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Leave blank for no discount"
                      value={writingChallengeSettings.discountPrice}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, discountPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={writingChallengeSettings.showDiscount}
                        onCheckedChange={(checked) =>
                          setWritingChallengeSettings({ ...writingChallengeSettings, showDiscount: checked })
                        }
                        disabled={!writingChallengeSettings.discountPrice}
                      />
                      <Label>Show strikethrough</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge Config */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Challenge Configuration</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (Days)</Label>
                    <Input
                      type="number"
                      value={writingChallengeSettings.durationDays}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, durationDays: parseInt(e.target.value) || 45 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Submissions</Label>
                    <Input
                      type="number"
                      value={writingChallengeSettings.minSubmissions}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, minSubmissions: parseInt(e.target.value) || 30 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Prompts</Label>
                    <Input
                      type="number"
                      value={writingChallengeSettings.promptsCount}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, promptsCount: parseInt(e.target.value) || 50 })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Call to Action</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA Button Text</Label>
                    <Input
                      value={writingChallengeSettings.ctaButtonText}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, ctaButtonText: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Description</Label>
                    <Input
                      value={writingChallengeSettings.ctaDescription}
                      onChange={(e) =>
                        setWritingChallengeSettings({ ...writingChallengeSettings, ctaDescription: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Support Channels */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Support Channels</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <Label>WhatsApp Support</Label>
                      </div>
                      <Switch
                        checked={writingChallengeSettings.whatsappEnabled}
                        onCheckedChange={(checked) =>
                          setWritingChallengeSettings({ ...writingChallengeSettings, whatsappEnabled: checked })
                        }
                      />
                    </div>
                    {writingChallengeSettings.whatsappEnabled && (
                      <Input
                        value={writingChallengeSettings.whatsappNumber}
                        onChange={(e) =>
                          setWritingChallengeSettings({ ...writingChallengeSettings, whatsappNumber: e.target.value })
                        }
                        placeholder="+919876543210"
                      />
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-600" />
                        <Label>Chatbot</Label>
                      </div>
                      <Switch
                        checked={writingChallengeSettings.chatbotEnabled}
                        onCheckedChange={(checked) =>
                          setWritingChallengeSettings({ ...writingChallengeSettings, chatbotEnabled: checked })
                        }
                      />
                    </div>
                    {writingChallengeSettings.chatbotEnabled && (
                      <Input
                        value={writingChallengeSettings.chatbotUrl}
                        onChange={(e) =>
                          setWritingChallengeSettings({ ...writingChallengeSettings, chatbotUrl: e.target.value })
                        }
                        placeholder="https://tawk.to/your-widget-url"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => saveSettings('writingChallenge')} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Challenge Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
              <CardDescription>Configure logo and site identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                      value={brandingSettings.siteName}
                      onChange={(e) =>
                        setBrandingSettings({ ...brandingSettings, siteName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={brandingSettings.tagline}
                      onChange={(e) =>
                        setBrandingSettings({ ...brandingSettings, tagline: e.target.value })
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Logo URL</Label>
                  <Input
                    value={brandingSettings.logoUrl}
                    onChange={(e) =>
                      setBrandingSettings({ ...brandingSettings, logoUrl: e.target.value })
                    }
                    placeholder="https://example.com/logo.svg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter URL to SVG or PNG logo. For best results, use a transparent background.
                  </p>
                  {brandingSettings.logoUrl && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                      <img src={brandingSettings.logoUrl} alt="Logo preview" className="h-12 object-contain" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => saveSettings('branding')} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Branding Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
