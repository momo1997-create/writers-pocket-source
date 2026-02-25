
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const LANGUAGES = [
  'English',
  'Hindi',
  'Gujarati',
  'Marathi',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Bengali',
  'Urdu',
  'Sanskrit',
  'Kannada',
  'Odia',
];

export default function NewBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    penName: '',
    language: '',
    categoryId: '',
    genre: '',
    sizeId: '',
  });

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []));

    fetch('/api/sizes')
      .then(res => res.json())
      .then(data => setSizes(data.sizes || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { title, language, categoryId, genre, sizeId } = formData;

    if (!title || !language || !categoryId || !genre || !sizeId) {
      toast({
        title: 'Missing fields',
        description: 'Please fill all required fields.',
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
        title: 'Book Created',
        description: 'Proceed to formatter to add your manuscript.',
      });

      router.push(`/author/books/${data.book.id}/formatter`);
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
    <div className="max-w-3xl mx-auto py-8">
      <Link href="/author/books" className="flex items-center text-sm mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Books
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Book</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <Label>Book Title *</Label>
              <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Input value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} />
            </div>

            <div>
              <Label>Pen Name</Label>
              <Input value={formData.penName} onChange={e => setFormData({ ...formData, penName: e.target.value })} />
            </div>

            <div>
              <Label>Language *</Label>

              <Select
                value={formData.language || undefined}
                onValueChange={(v) =>
                  setFormData({ ...formData, language: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>

                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category *</Label>
              <Select onValueChange={v => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Genre *</Label>
              <Input value={formData.genre} onChange={e => setFormData({ ...formData, genre: e.target.value })} />
            </div>

            <div>
              <Label>Size *</Label>
              <Select onValueChange={v => setFormData({ ...formData, sizeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {sizes.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Book
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
