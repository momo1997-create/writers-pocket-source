'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PenTool,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Heart,
  Search,
  Check,
  X,
  FileText,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function AdminBlogPage() {
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [guestPosts, setGuestPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [guestPostFilter, setGuestPostFilter] = useState('pending');
  const [commentFilter, setCommentFilter] = useState('false');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    authorName: 'Admin',
    category: '',
    tags: '',
    isPublished: false,
    linkedBookId: '',
    seoTitle: '',
    seoDesc: '',
  });

  useEffect(() => {
    fetchAllData();
  }, [guestPostFilter, commentFilter]);

  const fetchAllData = async () => {
    try {
      const [postsRes, guestPostsRes, commentsRes, booksRes] = await Promise.all([
        fetch('/api/admin/blog'),
        fetch(`/api/admin/guest-posts?status=${guestPostFilter}`),
        fetch(`/api/admin/blog/comments?approved=${commentFilter}`),
        fetch('/api/books?status=PUBLISHED&limit=100'),
      ]);

      const postsData = await postsRes.json();
      const guestPostsData = await guestPostsRes.json();
      const commentsData = await commentsRes.json();
      const booksData = await booksRes.json();

      setPosts(postsData.posts || []);
      setGuestPosts(guestPostsData.guestPosts || []);
      setComments(commentsData.comments || []);
      setBooks(booksData.books || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    try {
      const url = editingPost ? `/api/admin/blog/${editingPost.id}` : '/api/blog';
      const method = editingPost ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          coverImage: formData.coverImage,
          authorName: formData.authorName,
          category: formData.category,
          tags: formData.tags,
          isPublished: formData.isPublished,
          linkedBookId: formData.linkedBookId || null,
          seoTitle: formData.seoTitle,
          seoDesc: formData.seoDesc,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast({ title: 'Success', description: editingPost ? 'Post updated' : 'Post created' });
      setDialogOpen(false);
      resetForm();
      fetchAllData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      toast({ title: 'Success', description: 'Post deleted' });
      fetchAllData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast({ title: 'Success', description: post.isPublished ? 'Post unpublished' : 'Post published' });
      fetchAllData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleReviewGuestPost = async (guestPostId, status, rejectReason = '') => {
    try {
      const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
      const res = await fetch(`/api/admin/guest-posts/${guestPostId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectReason, reviewedBy: user.id }),
      });

      if (!res.ok) throw new Error('Failed to review');

      toast({
        title: 'Success',
        description: status === 'approved' ? 'Guest post approved and published' : 'Guest post rejected',
      });
      fetchAllData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleModerateComment = async (commentId, approved) => {
    try {
      const res = await fetch(`/api/admin/blog/comments/${commentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });

      if (!res.ok) throw new Error('Failed to moderate');

      toast({ title: 'Success', description: approved ? 'Comment approved' : 'Comment rejected' });
      fetchAllData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const res = await fetch(`/api/admin/blog/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      toast({ title: 'Success', description: 'Comment deleted' });
      fetchAllData();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      authorName: post.authorName,
      category: post.category || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      isPublished: post.isPublished,
      linkedBookId: post.linkedBookId || '',
      seoTitle: post.seoTitle || '',
      seoDesc: post.seoDesc || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      coverImage: '',
      authorName: 'Admin',
      category: '',
      tags: '',
      isPublished: false,
      linkedBookId: '',
      seoTitle: '',
      seoDesc: '',
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading blog data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground mt-1">Create posts, moderate comments, review guest submissions</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Post
        </Button>
      </div>

      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="posts">
            <FileText className="h-4 w-4 mr-2" /> Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="guest-posts">
            <Users className="h-4 w-4 mr-2" /> Guest Posts ({guestPosts.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-2" /> Comments ({comments.length})
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>All Blog Posts</CardTitle>
              <CardDescription>Manage your blog content</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No blog posts yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{post.title}</span>
                          {post.isPublished ? (
                            <Badge variant="default" className="text-xs">Published</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Draft</Badge>
                          )}
                          {post.category && (
                            <Badge variant="outline" className="text-xs">{post.category}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span>By {post.authorName}</span>
                          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublish(post)}
                          title={post.isPublished ? 'Unpublish' : 'Publish'}
                        >
                          {post.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(post.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guest Posts Tab */}
        <TabsContent value="guest-posts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Guest Post Submissions</CardTitle>
                  <CardDescription>Review and moderate guest submissions</CardDescription>
                </div>
                <Select value={guestPostFilter} onValueChange={setGuestPostFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {guestPosts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No guest posts to review</p>
                </div>
              ) : (
                <div className="divide-y">
                  {guestPosts.map((gp) => (
                    <div key={gp.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{gp.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            By {gp.writerName} ({gp.email}) • {formatDate(gp.createdAt)}
                          </p>
                        </div>
                        <Badge variant={gp.status === 'pending' ? 'secondary' : gp.status === 'approved' ? 'default' : 'destructive'}>
                          {gp.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {gp.content.substring(0, 200)}...
                      </p>
                      {gp.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReviewGuestPost(gp.id, 'approved')}
                          >
                            <Check className="mr-1 h-3 w-3" /> Approve & Publish
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = prompt('Rejection reason (optional):');
                              handleReviewGuestPost(gp.id, 'rejected', reason || '');
                            }}
                          >
                            <X className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comment Moderation</CardTitle>
                  <CardDescription>Approve or reject blog comments</CardDescription>
                </div>
                <Select value={commentFilter} onValueChange={setCommentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Pending</SelectItem>
                    <SelectItem value="true">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No comments to moderate</p>
                </div>
              ) : (
                <div className="divide-y">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{comment.authorName}</p>
                          <p className="text-xs text-muted-foreground">
                            On: {comment.post?.title || 'Unknown Post'} • {formatDate(comment.createdAt)}
                          </p>
                        </div>
                        <Badge variant={comment.isApproved ? 'default' : 'secondary'}>
                          {comment.isApproved ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm mb-3">{comment.content}</p>
                      <div className="flex items-center gap-2">
                        {!comment.isApproved && (
                          <Button size="sm" onClick={() => handleModerateComment(comment.id, true)}>
                            <Check className="mr-1 h-3 w-3" /> Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Post Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            <DialogDescription>
              {editingPost ? 'Update the blog post details' : 'Write and publish a new blog post'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter post title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your post content..."
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary (optional)"
                rows={2}
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Input
                  id="coverImage"
                  placeholder="https://..."
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorName">Author Name</Label>
                <Input
                  id="authorName"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Writing Tips"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="writing, tips, publishing"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link to Book (optional)</Label>
              <Select
                value={formData.linkedBookId || "none"}
                onValueChange={(value) => setFormData({ ...formData, linkedBookId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Publish Immediately</Label>
                <p className="text-xs text-muted-foreground">Make this post visible to readers</p>
              </div>
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingPost ? 'Update Post' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
