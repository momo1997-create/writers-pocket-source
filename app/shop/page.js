'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PenTool,
  Search,
  Filter,
  ShoppingCart,
  Star,
  Book,
  User,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function ShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('wp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    fetchBooks();
    fetchCategories();
    
    // Load cart from localStorage
    const storedCart = localStorage.getItem('wp_cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [searchQuery, selectedCategory, user]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (user?.id) params.append('userId', user.id);

      const res = await fetch(`/api/shop/books?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const addToCart = (book, format = 'paperback') => {
    const existingIndex = cart.findIndex(item => item.bookId === book.id && item.format === format);
    let newCart;

    if (existingIndex >= 0) {
      newCart = [...cart];
      newCart[existingIndex].quantity += 1;
    } else {
      const price = format === 'hardcover' ? book.hardcoverPrice : (book.paperbackPrice || book.price);
      newCart = [...cart, {
        bookId: book.id,
        title: book.title,
        author: book.author?.name,
        format,
        price,
        quantity: 1,
        coverImage: book.coverImage,
      }];
    }

    setCart(newCart);
    localStorage.setItem('wp_cart', JSON.stringify(newCart));
  };

  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    localStorage.setItem('wp_cart', JSON.stringify(newCart));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sortedBooks = [...books].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return (a.paperbackPrice || a.price) - (b.paperbackPrice || b.price);
      case 'price_high':
        return (b.paperbackPrice || b.price) - (a.paperbackPrice || a.price);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'newest':
      default:
        return new Date(b.publishedDate || b.createdAt) - new Date(a.publishedDate || a.createdAt);
    }
  });

  return (
    <div className="min-h-screen bg-background">
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
            <Link href="/free-publishing" className="hidden md:block text-foreground/80 hover:text-primary transition">
              Free Publishing
            </Link>
            <Link href="/writing-challenge" className="hidden md:block text-foreground/80 hover:text-primary transition">
              Writing Challenge
            </Link>

            {/* Cart */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Shopping Cart</SheetTitle>
                  <SheetDescription>
                    {cart.length === 0 ? 'Your cart is empty' : `${cartCount} item(s) in cart`}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-12 h-16 bg-muted-foreground/10 rounded flex items-center justify-center">
                        {item.coverImage ? (
                          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover rounded" />
                        ) : (
                          <Book className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.format} × {item.quantity}</p>
                        <p className="text-sm font-semibold text-primary">₹{item.price * item.quantity}</p>
                      </div>
                      <button onClick={() => removeFromCart(index)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between mb-4">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-bold text-primary">₹{cartTotal.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Standard delivery: 5-7 days (India only)
                    </p>
                    <Link href="/checkout">
                      <Button className="w-full">Proceed to Checkout</Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {user ? (
              <Link href="/author/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">Log In</Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-12 lg:py-16 wine-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Book Shop</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Discover amazing books from talented authors. Support independent writers.
          </p>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-6 border-b sticky top-16 z-40 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Books Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading books...</div>
            </div>
          ) : sortedBooks.length === 0 ? (
            <div className="text-center py-16">
              <Book className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Books Found</h2>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Check back soon for new releases!'}
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Showing {sortedBooks.length} book{sortedBooks.length !== 1 ? 's' : ''}
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedBooks.map((book) => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    onAddToCart={addToCart}
                    isAuthor={user?.id === book.authorId}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Writer's Pocket. All rights reserved.</p>
          <p className="mt-2">
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            {' · '}
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Book Card Component
function BookCard({ book, onAddToCart, isAuthor }) {
  const [selectedFormat, setSelectedFormat] = useState('paperback');
  
  const price = selectedFormat === 'hardcover' 
    ? book.hardcoverPrice 
    : (book.paperbackPrice || book.price);
  
  const discountedPrice = book.discountPrice;
  const hasDiscount = discountedPrice && discountedPrice < price;

  // External platform links
  const platformIcons = {
    amazon: '🛒',
    flipkart: '🛍️',
    kindle: '📱',
    google_books: '📚',
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[3/4] bg-muted relative">
        {book.coverImage ? (
          <img 
            src={book.coverImage} 
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Book className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {book.isAuthorCopy && (
          <Badge className="absolute top-2 left-2 bg-primary">Author Copy</Badge>
        )}
        {book.isBestSeller && (
          <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">Best Seller</Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <Link href={`/shop/${book.id}`}>
          <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors mb-1">
            {book.title}
          </h3>
        </Link>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <User className="h-3 w-3" />
          <span className="truncate">{book.author?.name || 'Unknown Author'}</span>
        </div>

        {book.category && (
          <Badge variant="secondary" className="text-xs mb-2">{book.category}</Badge>
        )}

        {book.isbn && (
          <p className="text-xs text-muted-foreground mb-2">ISBN: {book.isbn}</p>
        )}

        {/* Format selector if hardcover available */}
        {book.hasHardcover && (
          <div className="flex gap-2 mb-3">
            <button
              className={`flex-1 py-1 px-2 text-xs rounded border transition-colors ${
                selectedFormat === 'paperback'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary'
              }`}
              onClick={() => setSelectedFormat('paperback')}
            >
              Paperback
            </button>
            <button
              className={`flex-1 py-1 px-2 text-xs rounded border transition-colors ${
                selectedFormat === 'hardcover'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary'
              }`}
              onClick={() => setSelectedFormat('hardcover')}
            >
              Hardcover
            </button>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">₹{price}</span>
          )}
          <span className="text-lg font-bold text-primary">
            ₹{hasDiscount ? discountedPrice : price}
          </span>
        </div>

        {/* Add to cart */}
        <Button 
          className="w-full" 
          size="sm"
          onClick={() => onAddToCart(book, selectedFormat)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>

        {/* External links */}
        {book.externalLinks && book.externalLinks.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Also available on:</p>
            <div className="flex gap-2">
              {book.externalLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted-foreground/10 transition-colors"
                >
                  {platformIcons[link.platform] || '🔗'} {link.platform.replace('_', ' ')}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
