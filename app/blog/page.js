'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PenTool,
  Search,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  ChevronRight,
  Menu,
  X,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pagination, setPagination] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [selectedCategory]);

  const fetchPosts = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' });
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const res = await fetch(`/api/blog?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/blog/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
            <Link href="/blog" className="text-primary font-medium">Blog</Link>
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
            <Link href="/blog" className="block py-2 font-medium text-primary">Blog</Link>
            <Link href="/login"><Button className="w-full">Log In</Button></Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-16 wine-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Writer's Corner</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Insights, tips, and stories from the world of publishing
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading articles...</div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <PenTool className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Articles Found</h3>
              <p className="text-muted-foreground">Check back soon for new content!</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <Card className="group hover:shadow-lg transition-all duration-300 h-full overflow-hidden">
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <PenTool className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        {post.category && (
                          <Badge className="absolute top-3 left-3">{post.category}</Badge>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <h2 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.publishedAt)}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {post.views || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" /> {post._count?.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> {post._count?.comments || 0}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                          By {post.authorName}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === pagination.page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => fetchPosts(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Guest Post CTA */}
      <section className="py-12 bg-card/50 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-3">Have Something to Share?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            We welcome guest posts from writers. Share your insights, experiences, or creative pieces with our community.
          </p>
          <Link href="/blog/submit">
            <Button>
              Submit a Guest Post <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
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
