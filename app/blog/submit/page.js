'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PenTool,
  Send,
  ArrowLeft,
  FileText,
  User,
  Mail,
  Phone,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function SubmitGuestPostPage() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    writerName: '',
    email: '',
    phone: '',
    twitter: '',
    linkedin: '',
    website: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.writerName || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.content.length < 500) {
      toast({
        title: 'Content Too Short',
        description: 'Your post should be at least 500 characters',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const socialLinks = {};
      if (formData.twitter) socialLinks.twitter = formData.twitter;
      if (formData.linkedin) socialLinks.linkedin = formData.linkedin;
      if (formData.website) socialLinks.website = formData.website;

      const res = await fetch('/api/guest-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          writerName: formData.writerName,
          email: formData.email,
          phone: formData.phone,
          socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      setSubmitted(true);
      toast({
        title: 'Success!',
        description: 'Your guest post has been submitted for review',
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
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Submission Received!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your guest post submission. Our team will review it and get back to you within 3-5 business days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/blog">
                <Button variant="outline">Back to Blog</Button>
              </Link>
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
          <Link href="/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
            </Button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Submit a Guest Post</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Share your writing insights, experiences, or creative pieces with our community of readers and writers.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Submission
              </CardTitle>
              <CardDescription>
                Fields marked with * are required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Article Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Post Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter a compelling title for your post"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your post here... (minimum 500 characters)"
                      rows={12}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {formData.content.length} characters {formData.content.length < 500 && '(minimum 500)'}
                    </div>
                  </div>
                </div>

                {/* Author Details */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    About You
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="writerName">Your Name *</Label>
                      <Input
                        id="writerName"
                        placeholder="Full name"
                        value={formData.writerName}
                        onChange={(e) => setFormData({ ...formData, writerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
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
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Social Links (optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter/X</Label>
                      <Input
                        id="twitter"
                        placeholder="@username"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        placeholder="Profile URL"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://yoursite.com"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <h4 className="font-medium mb-2">Submission Guidelines:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Content must be original and not published elsewhere</li>
                    <li>Posts should be at least 500 characters</li>
                    <li>No promotional or sales content</li>
                    <li>Topics should relate to writing, publishing, or creativity</li>
                    <li>Review process takes 3-5 business days</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Submit for Review
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Writer's Pocket. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
