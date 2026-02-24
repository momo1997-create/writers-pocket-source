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
  Trophy,
  Calendar,
  Target,
  Clock,
  Gift,
  FileText,
  Zap,
  Sparkles,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function WritingChallengePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    fee: 1999,
    originalFee: 2999,
    showDiscount: true,
    durationDays: 45,
    minSubmissions: 30,
    promptsCount: 50,
    whatsappEnabled: true,
    whatsappNumber: '+919876543210',
  });
  const [reviews, setReviews] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    writingGoal: '',
  });

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchSettings();
    fetchReviews();
    
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
      const res = await fetch('/api/settings?category=writing_challenge');
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

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews?displayOn=writing_challenge');
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
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'writing_challenge',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          amount: settings.fee,
          metadata: {
            writingGoal: formData.writingGoal,
          },
        }),
      });

      const data = await res.json();

      if (data.paymentRequired) {
        toast({
          title: 'Registration Received',
          description: 'Payment gateway is being set up. Our team will contact you to complete enrollment.',
        });
      } else {
        toast({
          title: 'Registration Successful!',
          description: 'Welcome to the Writing Challenge! Check your email for next steps.',
        });
      }

      setFormOpen(false);
      setFormData({ name: '', email: '', phone: '', writingGoal: '' });
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

  const includedFeatures = [
    { icon: FileText, title: 'Text Formatting', desc: 'Professional interior layout' },
    { icon: Sparkles, title: 'Custom Cover Design', desc: 'Unique cover for your book' },
    { icon: Globe, title: 'Distribution', desc: 'All major platforms' },
    { icon: Award, title: '100% Royalty', desc: 'Keep all your earnings' },
    { icon: BookOpen, title: 'ISBN Registration', desc: 'Official book identifier' },
    { icon: Star, title: 'Basic Marketing', desc: 'Initial promotion support' },
    { icon: Gift, title: '2 Free Author Copies', desc: 'Physical copies of your book' },
    { icon: Trophy, title: 'E-Certificate', desc: 'Digital certificate of completion' },
  ];

  const challengeRules = [
    { number: '50', label: 'Prompts Provided', desc: 'Daily creative prompts to inspire your writing' },
    { number: '30', label: 'Minimum Pieces', desc: 'Complete at least 30 works to qualify' },
    { number: '45', label: 'Days Duration', desc: 'Complete the challenge at your pace' },
  ];

  const whatsappLink = `https://wa.me/${settings.whatsappNumber?.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in the Writing Challenge`;

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
            <Link href="/free-publishing" className="hidden md:block text-foreground/80 hover:text-primary transition">
              Free Publishing
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
            {/* Challenge Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 mb-6">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">45-Day Writing Challenge</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Transform Your Writing
              <span className="block mt-2 text-white/90">Into a Published Book</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              50 prompts. 45 days. One published book. Join our structured writing challenge and 
              become a published author with everything included.
            </p>

            {/* Pricing */}
            <div className="flex flex-col items-center gap-4 mb-8">
              {settings.showDiscount && settings.originalFee > settings.fee && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl line-through text-white/50">₹{settings.originalFee}</span>
                  <Badge className="bg-green-500 text-white">
                    Save {Math.round(((settings.originalFee - settings.fee) / settings.originalFee) * 100)}%
                  </Badge>
                </div>
              )}
              <div className="text-5xl md:text-6xl font-bold">
                ₹{settings.fee}
                <span className="text-lg font-normal text-white/70 ml-2">all-inclusive</span>
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
                Join the Challenge
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {settings.whatsappEnabled && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Ask Questions
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Rules */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A structured path from idea to published book
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            {challengeRules.map((rule, index) => (
              <Card key={index} className="text-center feature-card">
                <CardContent className="pt-8 pb-6">
                  <div className="text-5xl font-bold text-primary mb-2">{rule.number}</div>
                  <div className="text-lg font-semibold mb-2">{rule.label}</div>
                  <p className="text-sm text-muted-foreground">{rule.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Allowed Formats */}
          <div className="max-w-3xl mx-auto">
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-center">Allowed Formats</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {['Poems', 'Short Stories', 'Novel Chapters'].map((format) => (
                    <Badge key={format} variant="secondary" className="text-base py-2 px-4">
                      <Check className="h-4 w-4 mr-2" />
                      {format}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Submit drafts during the challenge. Final submission after completion.
                  Extensions available if needed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 lg:py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Get</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Complete publishing package included in your enrollment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {includedFeatures.map((feature, index) => (
              <Card key={index} className="feature-card">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Journey</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From enrollment to published author in 45 days
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {[
                { step: 1, title: 'Enroll & Start', desc: 'Pay once, receive your first prompts via email and dashboard' },
                { step: 2, title: 'Write Daily', desc: 'Complete prompts at your pace - poems, stories, or novel chapters' },
                { step: 3, title: 'Submit & Refine', desc: 'Upload drafts, receive feedback, make final submissions' },
                { step: 4, title: 'Get Published', desc: 'We format, design, and publish your book + send your author copies' },
              ].map((item, index) => (
                <div key={index} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <section className="py-16 lg:py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Success Stories</h2>
              <p className="text-muted-foreground">From challenge participants to published authors</p>
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
            Ready to Write Your Story?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of writers who have transformed their creativity into published works.
            Your 45-day journey starts today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 text-lg px-8"
              onClick={() => setFormOpen(true)}
            >
              Join for ₹{settings.fee}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Writer's Pocket. All rights reserved.</p>
        </div>
      </footer>

      {/* Enrollment Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join the Writing Challenge</DialogTitle>
            <DialogDescription>
              Enroll in the 45-day challenge and start your journey to becoming a published author.
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
              <Label htmlFor="writingGoal">What do you want to write?</Label>
              <Select
                value={formData.writingGoal}
                onValueChange={(value) => setFormData({ ...formData, writingGoal: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poetry">Poetry Collection</SelectItem>
                  <SelectItem value="short_stories">Short Stories</SelectItem>
                  <SelectItem value="novel">Novel</SelectItem>
                  <SelectItem value="mixed">Mixed / Not Sure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Challenge Fee</span>
                <span className="text-xl font-bold text-primary">₹{settings.fee}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Includes publishing, design, distribution, 2 author copies, and e-certificate.
              </p>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={loading}>
              {loading ? 'Processing...' : 'Enroll Now'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By enrolling, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
