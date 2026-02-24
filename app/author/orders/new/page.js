'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingCart,
  Minus,
  Plus,
  Book,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/author/books');
      const data = await res.json();
      // Only show published books with author copy pricing
      const publishedBooks = (data.books || []).filter(b => b.status === 'PUBLISHED');
      setBooks(publishedBooks);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load books', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (book, format) => {
    const existing = cartItems.find(item => item.bookId === book.id && item.format === format);
    if (existing) {
      updateQuantity(book.id, format, existing.quantity + 1);
    } else {
      setCartItems([...cartItems, {
        bookId: book.id,
        bookTitle: book.title,
        format,
        quantity: 1,
        price: book.authorCopyPrice || 199, // Default author copy price
      }]);
    }
  };

  const updateQuantity = (bookId, format, newQty) => {
    if (newQty < 1) {
      setCartItems(cartItems.filter(item => !(item.bookId === bookId && item.format === format)));
    } else {
      setCartItems(cartItems.map(item =>
        item.bookId === bookId && item.format === format
          ? { ...item, quantity: newQty }
          : item
      ));
    }
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      toast({ title: 'Error', description: 'Please add items to your cart', variant: 'destructive' });
      return;
    }

    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.pincode) {
      toast({ title: 'Error', description: 'Please fill in all required shipping details', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const storedUser = localStorage.getItem('wp_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch('/api/author/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          items: cartItems,
          shippingAddress,
          notes,
          totalAmount: getTotal(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create order');

      toast({ title: 'Success', description: 'Order placed successfully!' });
      router.push('/author/orders');
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading books...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/author/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Order Author Copies</h1>
          <p className="text-muted-foreground mt-1">Order copies of your published books at special author pricing</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Book Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Books</CardTitle>
              <CardDescription>Choose from your published books</CardDescription>
            </CardHeader>
            <CardContent>
              {books.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No published books available for ordering</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {books.map((book) => (
                    <Card key={book.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {book.coverImage && (
                            <div className="w-20 h-28 bg-muted rounded overflow-hidden flex-shrink-0">
                              <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{book.title}</h3>
                            {book.category && <Badge variant="secondary" className="mb-2">{book.category}</Badge>}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {book.isbnPaperback && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(book, 'Paperback')}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Paperback (₹{book.authorCopyPrice || 199})
                                </Button>
                              )}
                              {book.isbnHardcover && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(book, 'Hardcover')}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Hardcover (₹{book.authorCopyPriceHardcover || 399})
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Textarea
                  value={shippingAddress.address}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode *</Label>
                  <Input
                    value={shippingAddress.pincode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Order Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.bookTitle}</p>
                          <p className="text-xs text-muted-foreground">{item.format} • ₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.bookId, item.format, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.bookId, item.format, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-4">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-bold">₹{getTotal().toLocaleString()}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                    >
                      {submitting ? 'Placing Order...' : 'Place Order'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Payment link will be sent to your email
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
