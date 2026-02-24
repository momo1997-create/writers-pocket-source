'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PenTool,
  Check,
  Star,
  MessageCircle,
  ArrowRight,
  BookOpen,
  Award,
  Globe,
  Shield,
  Sparkles,
  Clock,
  Plus,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function FreePublishingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    processingFee: 999,
    originalFee: 1499,
    showDiscount: true,
    signupMode: 'lead',
    whatsappEnabled: true,
    whatsappNumber: '+919876543210',
    whatsappText: 'Chat with us',
  });
  const [addOns, setAddOns] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState({});
  const [reviews, setReviews] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bookDescription: '',
    manuscriptStatus: 'not_started',
  });

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchSettings();
    fetchAddOns();
    fetchReviews();
    
    // Initialize countdown timer
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateCountdown = () => {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const diff = endOfDay - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeLeft({ hours, minutes, seconds });
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings?category=free_publishing');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchAddOns = async () => {
    try {
      const res = await fetch('/api/addons?serviceType=free_publishing');
      if (res.ok) {
        const data = await res.json();
        setAddOns(data.addOns || []);
      }
    } catch (error) {
      console.error('Error fetching add-ons:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews?displayOn=free_publishing');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (settings.signupMode === 'lead') {
        // Submit as lead
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            source: 'WEBSITE',
            interestArea: 'Free Publishing',
            notes: `Book: ${formData.bookDescription}\nManuscript Status: ${formData.manuscriptStatus}`,
          }),
        });

        if (!res.ok) throw new Error('Failed to submit');

        toast({
          title: 'Thank You!',
          description: 'Our team will contact you within 24 hours.',
        });
        setFormOpen(false);
        setFormData({ name: '', email: '', phone: '', bookDescription: '', manuscriptStatus: 'not_started' });
      } else {
        // Redirect to payment
        const res = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceType: 'free_publishing',
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            amount: settings.processingFee,
            addOns: selectedAddOns,
            metadata: {
              bookDescription: formData.bookDescription,
              manuscriptStatus: formData.manuscriptStatus,
            },
          }),
        });

        const data = await res.json();

        if (data.razorpayOrderId) {
          // Redirect to Razorpay checkout
          window.location.href = `/checkout?orderId=${data.razorpayOrderId}&type=enrollment`;
        } else {
          toast({
            title: 'Registration Successful',
            description: 'Payment gateway is being set up. We will contact you soon.',
          });
          setFormOpen(false);
        }
      }
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

  const includedServices = [
    { icon: BookOpen, title: 'Interior Text Formatting', desc: 'Professional layout for your book' },
    { icon: Sparkles, title: 'Custom Cover Design', desc: 'Eye-catching cover tailored to your book' },
    { icon: Globe, title: 'Multi-Platform Distribution', desc: 'Amazon Prime, Flipkart, Kindle, Google Books' },
    { icon: Award, title: '100% Royalty', desc: 'You keep all your earnings' },
    { icon: Shield, title: 'ISBN Registration', desc: 'Your book gets a unique identifier' },
    { icon: Star, title: 'Basic Marketing', desc: 'Initial promotion to reach readers' },
  ];

  const whatsappLink = `https://wa.me/${settings.whatsappNumber?.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in Free Publishing`;

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
            <Link href="/shop" className="hidden md:block text-foreground/80 hover:text-primary transition">
              Shop
            </Link>
            <Link href="/writing-challenge" className="hidden md:block text-foreground/80 hover:text-primary transition">
              Writing Challenge
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 wine-gradient text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Limited Time Offer Badge */}
            {settings.showDiscount && (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 mb-6">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Limited Time Offer - Ends Tonight!</span>
              </div>
            )}

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Publish Your Book
              <span className="block mt-2 text-white/90">Absolutely Free*</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Just a one-time processing fee. No hidden costs. No surprises.
              We publish in <strong>all languages</strong> with <strong>no age restrictions</strong>.
            </p>

            {/* Pricing */}
            <div className="flex flex-col items-center gap-4 mb-8">
              {settings.showDiscount && settings.originalFee > settings.processingFee && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl line-through text-white/50">₹{settings.originalFee}</span>
                  <Badge className="bg-green-500 text-white">
                    Save {Math.round(((settings.originalFee - settings.processingFee) / settings.originalFee) * 100)}%
                  </Badge>
                </div>
              )}
              <div className="text-5xl md:text-6xl font-bold">
                ₹{settings.processingFee}
                <span className="text-lg font-normal text-white/70 ml-2">only</span>
              </div>
            </div>

            {/* Countdown Timer */}
            {settings.showDiscount && (
              <div className="flex justify-center gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2 min-w-16 text-center">
                  <div className="text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-xs text-white/70 uppercase">Hours</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2 min-w-16 text-center">
                  <div className="text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-xs text-white/70 uppercase">Minutes</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2 min-w-16 text-center">
                  <div className="text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-xs text-white/70 uppercase">Seconds</div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 text-lg px-8"
                onClick={() => setFormOpen(true)}
              >
                Start Publishing Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {settings.whatsappEnabled && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {settings.whatsappText || 'Chat with us'}
                  </Button>
                </a>
              )}
            </div>

            <p className="text-sm text-white/60 mt-4">
              *Processing fee covers formatting, design, ISBN, and distribution costs
            </p>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything Included</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your ₹{settings.processingFee} processing fee covers all these services. No hidden charges.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {includedServices.map((service, index) => (
              <Card key={index} className="feature-card border-2 hover:border-primary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Hidden Costs Banner */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-full px-6 py-3">
              <Shield className="h-6 w-6 text-green-600" />
              <span className="text-green-800 font-semibold">100% Transparent - No Hidden Costs Ever</span>
            </div>
          </div>
        </div>
      </section>

      {/* Add-Ons Section */}
      {addOns.length > 0 && (
        <section className="py-16 lg:py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Optional Add-Ons</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Enhance your publishing package with these premium services
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {addOns.map((addon) => (
                <Card key={addon.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      ₹{addon.basePrice}
                      {addon.pricingType === 'per_unit' && (
                        <span className="text-sm font-normal text-muted-foreground"> / unit</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Distribution Platforms */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Book, Everywhere</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We distribute your book on all major platforms
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 items-center">
            {['Amazon Prime', 'Flipkart', 'Kindle', 'Google Books'].map((platform) => (
              <div key={platform} className="px-6 py-4 bg-card rounded-lg border shadow-sm">
                <span className="font-semibold text-lg">{platform}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <section className="py-16 lg:py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Authors Say</h2>
              <p className="text-muted-foreground">Real reviews from our published authors</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-foreground/80 mb-4">{review.content}</p>
                    <div>
                      <p className="font-semibold">{review.authorName}</p>
                      {review.bookTitle && (
                        <p className="text-sm text-muted-foreground">{review.bookTitle}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-16 lg:py-20 wine-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Become a Published Author?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of writers who have shared their stories with the world.
            Your journey starts with just ₹{settings.processingFee}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 text-lg px-8"
              onClick={() => setFormOpen(true)}
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {settings.whatsappEnabled && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Have Questions?
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Writer's Pocket. All rights reserved.</p>
          <p className="mt-2">
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            {' · '}
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </p>
        </div>
      </footer>

      {/* Lead Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Your Publishing Journey</DialogTitle>
            <DialogDescription>
              Fill in your details and our team will guide you through the process.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookDescription">Tell us about your book</Label>
              <Textarea
                id="bookDescription"
                placeholder="Brief description of your book..."
                value={formData.bookDescription}
                onChange={(e) => setFormData({ ...formData, bookDescription: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Manuscript Status</Label>
              <Select
                value={formData.manuscriptStatus}
                onValueChange={(value) => setFormData({ ...formData, manuscriptStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started Yet</SelectItem>
                  <SelectItem value="in_progress">Writing in Progress</SelectItem>
                  <SelectItem value="completed">Completed / Ready</SelectItem>
                  <SelectItem value="needs_editing">Completed, Needs Editing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : settings.signupMode === 'lead' ? 'Get Started' : 'Proceed to Payment'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By submitting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
