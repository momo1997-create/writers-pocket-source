'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PenTool,
  Send,
  Menu,
  X,
  Users,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Instagram,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

export default function AnthologyPage() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    isWhatsApp: true,
    whatsAppNumber: '',
    email: '',
    instagramUsername: '',
    poetryTitle: '',
    poetryContent: '',
    bio: '',
    contactPreference: 'email',
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/anthology/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.email || !formData.poetryTitle || !formData.poetryContent || !formData.contactPreference) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.poetryContent.length < 100) {
      toast({
        title: 'Content Too Short',
        description: 'Your poetry/writing should be at least 100 characters',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/anthology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthName: formData.name,
          anthPhone: formData.phone,
          isWhatsApp: formData.isWhatsApp,
          whatsAppNumber: !formData.isWhatsApp ? formData.whatsAppNumber : null,
          anthEmail: formData.email,
          instagramUsername: formData.instagramUsername,
          poetryTitle: formData.poetryTitle,
          poetryContent: formData.poetryContent,
          bio: formData.bio,
          contactPreference: formData.contactPreference,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      setSubmitted(true);
      fetchStats(); // Refresh stats
      toast({
        title: 'Submission Received!',
        description: 'Thank you for your submission. We will review it shortly.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen literary-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your submission has been received. Our team will review your work and contact you via your preferred method.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Submit Another
              </Button>
              <Link href="/">
                <Button>Go to Homepage</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen literary-bg">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <PenTool className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gradient" style={{ fontFamily: 'Playfair Display' }}>
              Writer's Pocket
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/shop" className="text-foreground/80 hover:text-primary transition">Shop</Link>
            <Link href="/free-publishing" className="text-foreground/80 hover:text-primary transition">Free Publishing</Link>
            <Link href="/writing-challenge" className="text-foreground/80 hover:text-primary transition">Writing Challenge</Link>
            <Link href="/blog" className="text-foreground/80 hover:text-primary transition">Blog</Link>
            <Link href="/login"><Button variant="outline">Log In</Button></Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b p-4 space-y-4">
            <Link href="/shop" className="block py-2">Shop</Link>
            <Link href="/free-publishing" className="block py-2">Free Publishing</Link>
            <Link href="/writing-challenge" className="block py-2">Writing Challenge</Link>
            <Link href="/blog" className="block py-2">Blog</Link>
            <Link href="/login"><Button className="w-full">Log In</Button></Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-16 wine-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Anthology Submissions</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-6">
            Share your poetry and creative writing for a chance to be featured in our upcoming anthology collection.
          </p>
          
          {/* Live Counter */}
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur rounded-lg px-6 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-2xl font-bold">{stats.today}</span>
            </div>
            <div className="text-left">
              <p className="text-sm opacity-90">submissions</p>
              <p className="text-xs opacity-70">in the last 24 hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submit Your Work
              </CardTitle>
              <CardDescription>
                Fill in the form below to submit your poetry or creative writing. Fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isWhatsApp"
                      checked={formData.isWhatsApp}
                      onCheckedChange={(checked) => setFormData({ ...formData, isWhatsApp: checked })}
                    />
                    <Label htmlFor="isWhatsApp" className="text-sm">
                      This number has WhatsApp
                    </Label>
                  </div>

                  {!formData.isWhatsApp && (
                    <div className="space-y-2">
                      <Label htmlFor="whatsAppNumber">WhatsApp Number (if different)</Label>
                      <Input
                        id="whatsAppNumber"
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={formData.whatsAppNumber}
                        onChange={(e) => setFormData({ ...formData, whatsAppNumber: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram Username (optional)</Label>
                    <Input
                      id="instagram"
                      placeholder="@yourusername"
                      value={formData.instagramUsername}
                      onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value })}
                    />
                  </div>
                </div>

                {/* Your Submission */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Your Submission</h3>

                  <div className="space-y-2">
                    <Label htmlFor="poetryTitle">Title of Your Work *</Label>
                    <Input
                      id="poetryTitle"
                      placeholder="Give your work a title"
                      value={formData.poetryTitle}
                      onChange={(e) => setFormData({ ...formData, poetryTitle: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poetryContent">Your Poetry / Writing *</Label>
                    <Textarea
                      id="poetryContent"
                      placeholder="Paste or write your poetry/creative writing here..."
                      rows={10}
                      value={formData.poetryContent}
                      onChange={(e) => setFormData({ ...formData, poetryContent: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.poetryContent.length} characters {formData.poetryContent.length < 100 && '(minimum 100)'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio (optional)</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us a bit about yourself (2-3 sentences)"
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>
                </div>

                {/* Contact Preference */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact Preference *</h3>
                  <p className="text-sm text-muted-foreground">How would you prefer us to contact you?</p>
                  
                  <RadioGroup
                    value={formData.contactPreference}
                    onValueChange={(value) => setFormData({ ...formData, contactPreference: value })}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="pref-email" />
                      <Label htmlFor="pref-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="instagram" id="pref-instagram" />
                      <Label htmlFor="pref-instagram" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" /> Instagram DM
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Submit for Review
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    By submitting, you confirm this is your original work and grant us permission to publish it in our anthology.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 bg-card/50 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">About the Anthology</h2>
            <p className="text-muted-foreground mb-6">
              Our anthology brings together voices from emerging and established writers. Selected works will be professionally edited and published as part of our seasonal collection. Contributors receive a complimentary copy and royalties from sales.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">{stats.total}+</p>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">4</p>
                <p className="text-sm text-muted-foreground">Volumes Published</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">200+</p>
                <p className="text-sm text-muted-foreground">Featured Writers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Writer's Pocket. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
