'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Globe,
  Book,
  ExternalLink,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Public Author Profile Page - SEO Indexable
export default function PublicAuthorProfilePage() {
  const params = useParams();
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthorProfile();
  }, [params.slug]);

  const fetchAuthorProfile = async () => {
    try {
      const res = await fetch(`/api/public/authors/${params.slug}`);
      if (!res.ok) throw new Error('Author not found');
      const data = await res.json();
      setAuthor(data.author);
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Author Not Found</h1>
          <p className="text-muted-foreground">This author profile does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Profile Image */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {author.profileImage ? (
                <img
                  src={author.profileImage}
                  alt={author.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-16 w-16 text-primary" />
              )}
            </div>

            {/* Author Info */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{author.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">Author</p>
              
              {/* Social Links */}
              {author.socialLinks && Object.keys(author.socialLinks).length > 0 && (
                <div className="flex justify-center md:justify-start gap-3">
                  {Object.entries(author.socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const Icon = getSocialIcon(platform);
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-background hover:bg-primary/10 transition-colors"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bio Section */}
          <div className="lg:col-span-2 space-y-8">
            {author.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{author.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Published Books */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Published Books ({books.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {books.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No published books yet</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {books.map((book) => (
                      <Card key={book.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex">
                          {book.coverImage && (
                            <div className="w-24 h-32 bg-muted flex-shrink-0">
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-4 flex-1">
                            <h3 className="font-semibold mb-1">{book.title}</h3>
                            {book.category && (
                              <Badge variant="secondary" className="mb-2">{book.category}</Badge>
                            )}
                            {book.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{book.description}</p>
                            )}
                            {book.externalLinks?.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {book.externalLinks.slice(0, 2).map((link) => (
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
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Connect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {author.website && (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                    <span>Website</span>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                )}
                {author.email && (
                  <a
                    href={`mailto:${author.email}`}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    <span>Email</span>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{books.length}</p>
                  <p className="text-muted-foreground">Published Books</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
