'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function NewBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    genre: '',
  });

  const categories = [
    'Fiction',
    'Non-Fiction',
    'Poetry',
    'Biography',
    'Self-Help',
    'Business',
    'Children',
    'Academic',
    'Other',
  ];

  const genres = {
    Fiction: ['Romance', 'Mystery', 'Thriller', 'Science Fiction', 'Fantasy', 'Literary Fiction', 'Historical'],
    'Non-Fiction': ['Memoir', 'History', 'Science', 'Philosophy', 'Travel', 'True Crime'],
    Poetry: ['Contemporary', 'Classic', 'Haiku', 'Free Verse'],
    Biography: ['Autobiography', 'Memoir', 'Historical Figure'],
    'Self-Help': ['Personal Development', 'Relationships', 'Health & Wellness', 'Productivity'],
    Business: ['Entrepreneurship', 'Leadership', 'Marketing', 'Finance'],
    Children: ['Picture Book', 'Middle Grade', 'Young Adult'],
    Academic: ['Textbook', 'Research', 'Reference'],
    Other: ['Anthology', 'Essay Collection', 'Other'],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your book.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      if (!user?.id) {
        throw new Error('Please log in to create a book');
      }

      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          authorId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create book');
      }

      toast({
        title: 'Book Created!',
        description: 'Your book has been created. Now upload your manuscript to get started.',
      });

      router.push(`/author/books/${data.book.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/author/books">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Create New Book</h1>
          <p className="text-muted-foreground">Start your publishing journey</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Book Details</CardTitle>
          <CardDescription>
            Enter the basic information about your book. You can update these details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                placeholder="Enter your book title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                placeholder="Enter a subtitle (optional)"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value, genre: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  value={formData.genre}
                  onValueChange={(value) => setFormData({ ...formData, genre: value })}
                  disabled={!formData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.category &&
                      genres[formData.category]?.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Book Description</Label>
              <Textarea
                id="description"
                placeholder="Write a brief description of your book..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This description will appear on your book's page and in search results.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/author/books" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Book'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">What happens next?</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>After creating your book, upload your manuscript</li>
            <li>Our team will review and guide you through publishing stages</li>
            <li>Track progress, approve stages, and raise queries anytime</li>
            <li>Your book gets published and listed in our shop!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
