'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  PenTool,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  ArrowLeft,
  Book,
  Send,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function BlogPostPage() {
  const params = useParams();
  const { toast } = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentForm, setCommentForm] = useState({ name: '', email: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.slug) {
      fetchPost();
      checkLiked();
    }
  }, [params.slug]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/blog/${params.slug}`);
      if (!res.ok) {
        setPost(null);
        return;
      }
      const data = await res.json();
      setPost(data.post);
      setLikeCount(data.post?._count?.likes || 0);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLiked = () => {
    const visitorId = getVisitorId();
    const likedPosts = JSON.parse(localStorage.getItem('wp_liked_posts') || '[]');
    setLiked(likedPosts.includes(params.slug));
  };

  const getVisitorId = () => {
    let visitorId = localStorage.getItem('wp_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('wp_visitor_id', visitorId);
    }
    return visitorId;
  };

  const handleLike = async () => {
    const visitorId = getVisitorId();
    try {
      const res = await fetch(`/api/blog/${params.slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });
      const data = await res.json();

      const likedPosts = JSON.parse(localStorage.getItem('wp_liked_posts') || '[]');
      if (data.liked) {
        likedPosts.push(params.slug);
        setLikeCount((prev) => prev + 1);
      } else {
        const idx = likedPosts.indexOf(params.slug);
        if (idx > -1) likedPosts.splice(idx, 1);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
      localStorage.setItem('wp_liked_posts', JSON.stringify(likedPosts));
      setLiked(data.liked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentForm.name || !commentForm.content) {
      toast({ title: 'Error', description: 'Name and comment are required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/blog/${params.slug}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: commentForm.name,
          authorEmail: commentForm.email,
          content: commentForm.content,
        }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Comment submitted for moderation' });
        setCommentForm({ name: '', email: '', content: '' });
      } else {
        throw new Error('Failed to submit comment');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link Copied', description: 'Article link copied to clipboard' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading article...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <PenTool className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
        <Link href="/blog">
          <Button><ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog</Button>
        </Link>
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
          <div className="flex items-center gap-4">
            <Link href="/blog">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Article */}
      <article className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <header className="mb-8">
            {post.category && (
              <Badge className="mb-4">{post.category}</Badge>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span>By {post.authorName}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" /> {post.views || 0} views
              </span>
            </div>
          </header>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-8">
            <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Linked Book */}
          {post.linkedBook && (
            <Card className="mb-8 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Book className="h-5 w-5" />
                  Related Book
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {post.linkedBook.coverImage && (
                    <img
                      src={post.linkedBook.coverImage}
                      alt={post.linkedBook.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                  )}
                  <div>
                    <h4 className="font-semibold">{post.linkedBook.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      by {post.linkedBook.author?.name}
                    </p>
                    <Link href={`/shop?book=${post.linkedBook.id}`}>
                      <Button variant="link" className="p-0 h-auto mt-2">View in Shop</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 py-6 border-t border-b mb-8">
            <Button
              variant={liked ? 'default' : 'outline'}
              onClick={handleLike}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              {liked ? 'Liked' : 'Like'} ({likeCount})
            </Button>
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          {/* Comments */}
          <section>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({post.comments?.length || 0})
            </h3>

            {/* Comment Form */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        placeholder="Your Name *"
                        value={commentForm.name}
                        onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email (optional)"
                        value={commentForm.email}
                        onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="Write your comment..."
                    rows={4}
                    value={commentForm.content}
                    onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Submit Comment
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Comments are moderated before appearing.
                  </p>
                </form>
              </CardContent>
            </Card>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{comment.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-foreground/80">{comment.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
          </section>
        </div>
      </article>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Writer's Pocket. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
