'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Book,
  ExternalLink,
  Edit,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AuthorProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profileRes, booksRes] = await Promise.all([
        fetch(`/api/author/settings?authorId=${user.id}`, {
          headers: { 'x-user-id': user.id },
        }),
        fetch(`/api/author/books?authorId=${user.id}`, {
          headers: { 'x-user-id': user.id },
        }),
      ]);
      const profileData = await profileRes.json();
      const booksData = await booksRes.json();
      setProfile(profileData.profile || {
        name: user.name,
        email: user.email,
        publicUrl: user.publicUrl,
      });
      setBooks(booksData.books || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyProfileLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const profileUrl = `${baseUrl}/author/${profile?.publicUrl || 'profile'}`;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Profile link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const getSocialIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      twitter: Twitter,
      facebook: Facebook,
      linkedin: Linkedin,
      youtube: Youtube,
    };
    return icons[platform.toLowerCase()] || Globe;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-4">Unable to load your profile. Please try again.</p>
        <Button onClick={fetchProfile}>Retry</Button>
      </div>
    );
  }

  const publishedBooks = books.filter(b => b.status === 'PUBLISHED');
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/author/${profile.publicUrl || 'profile'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your public author profile</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyProfileLink}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Link href="/author/settings">
            <Button>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Preview</CardTitle>
          <CardDescription>
            This is how your profile appears to visitors at{' '}
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {profileUrl}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-16 w-16 text-primary" />
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{profile.name}</h2>
              <p className="text-muted-foreground mb-4">Author</p>
              
              {profile.bio ? (
                <p className="text-muted-foreground mb-4 whitespace-pre-line">{profile.bio}</p>
              ) : (
                <p className="text-muted-foreground mb-4 italic">No bio added yet. Add one in your settings.</p>
              )}

              {/* Contact & Links */}
              <div className="flex flex-wrap gap-4 mb-4">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Mail className="h-4 w-4" /> {profile.email}
                  </a>
                )}
              </div>

              {/* Social Links */}
              {profile.socialLinks && Object.keys(profile.socialLinks).some(k => profile.socialLinks[k]) && (
                <div className="flex gap-3">
                  {Object.entries(profile.socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const Icon = getSocialIcon(platform);
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-muted hover:bg-primary/10 transition-colors"
                        title={platform}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Published Books */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Published Books ({publishedBooks.length})
          </CardTitle>
          <CardDescription>These books appear on your public profile</CardDescription>
        </CardHeader>
        <CardContent>
          {publishedBooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No published books yet</p>
              <p className="text-sm">Your published books will appear here and on your public profile</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedBooks.map((book) => (
                <Card key={book.id} className="overflow-hidden">
                  <div className="aspect-[3/4] bg-muted relative">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Book className="h-16 w-16 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-1">{book.title}</h3>
                    {book.category && (
                      <Badge variant="secondary" className="mb-2">{book.category}</Badge>
                    )}
                    {book.externalLinks?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {book.externalLinks.slice(0, 3).map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {link.platform} <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Info */}
      <Card>
        <CardHeader>
          <CardTitle>SEO & Discoverability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Your public profile is SEO-optimized and Google-indexable. Share it as your author link-in-bio!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-background rounded text-sm">{profileUrl}</code>
              <Button variant="outline" size="sm" onClick={copyProfileLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>✅ Automatically indexed by search engines</p>
            <p>✅ Shows all your published books</p>
            <p>✅ Displays your bio and social links</p>
            <p>✅ Mobile-friendly design</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
