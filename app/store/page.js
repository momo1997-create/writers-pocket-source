'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, ShoppingCart, Filter, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StorePage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/store/books');
      const data = await res.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Filter books
  const filteredBooks = books.filter(book => {
    // Only show publicly listed books
    if (!book.isPublic) return false;
    // Don't show author-copy-only books to non-authors
    if (book.isAuthorCopy) return false;
    
    // Search filter
    const displayTitle = book.storeDisplayTitle || book.title;
    const displayAuthor = book.storeDisplayAuthor || book.author?.name;
    if (searchQuery && !displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !displayAuthor?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (categoryFilter !== 'all' && book.category !== categoryFilter) {
      return false;
    }
    
    return true;
  });

  // Get available formats for a book
  const getAvailableFormats = (book) => {
    const formats = [];
    if (book.hasPaperback !== false) formats.push('Paperback');
    if (book.hasHardcover) formats.push('Hardcover');
    if (book.hasEbook) formats.push('Ebook');
    return formats;
  };

  // Get price display
  const getPriceDisplay = (book) => {
    const price = book.paperbackPrice || book.price || 0;
    const discount = book.discountPrice;
    
    if (discount && discount < price) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-green-600">₹{discount}</span>
          <span className="text-sm text-muted-foreground line-through">₹{price}</span>
        </div>
      );
    }
    
    return <span className="text-lg font-bold">₹{price}</span>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading store...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book Store</h1>
        <p className="text-muted-foreground">Browse and purchase our published books</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16">
          <Book className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No books available</h3>
          <p className="text-muted-foreground">Check back later for new releases</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map(book => {
            const displayTitle = book.storeDisplayTitle || book.title;
            const displayAuthor = book.storeDisplayAuthor || book.author?.name;
            const displayDescription = book.storeDisplayDescription || book.description;
            const displayCover = book.storeDisplayCover || book.coverImage;
            const formats = getAvailableFormats(book);

            return (
              <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] bg-muted relative">
                  {displayCover ? (
                    <img
                      src={displayCover}
                      alt={displayTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Book className="h-16 w-16 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  {book.discountPrice && book.discountPrice < (book.paperbackPrice || book.price) && (
                    <Badge className="absolute top-2 right-2 bg-red-500">Sale</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-1">{displayTitle}</h3>
                  <p className="text-sm text-muted-foreground mb-2">by {displayAuthor}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {formats.map(format => (
                      <Badge key={format} variant="outline" className="text-xs">
                        {format}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {getPriceDisplay(book)}
                    <Link href={`/store/${book.id}`}>
                      <Button size="sm">
                        <ShoppingCart className="h-4 w-4 mr-1" /> View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
