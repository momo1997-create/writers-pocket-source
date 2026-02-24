'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Book,
  PenTool,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Star,
  Menu,
  X,
  Sparkles,
  Award,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [homepageData, setHomepageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animatedCounter, setAnimatedCounter] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  // Animated counter effect
  useEffect(() => {
    if (homepageData?.booksPublished && homepageData.booksPublished > 0) {
      const target = homepageData.booksPublished;
      const duration = 2000; // 2 seconds
      const stepTime = 50;
      const steps = duration / stepTime;
      const increment = target / steps;
      
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setAnimatedCounter(target);
          clearInterval(timer);
        } else {
          setAnimatedCounter(Math.floor(current));
        }
      }, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [homepageData?.booksPublished]);

  const fetchData = async () => {
    try {
      const [packagesRes, homepageRes] = await Promise.all([
        fetch('/api/packages'),
        fetch('/api/homepage'),
      ]);
      
      const packagesData = await packagesRes.json();
      const homepageDataRes = await homepageRes.json();
      
      setPackages(packagesData.packages || []);
      setHomepageData(homepageDataRes);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Book,
      title: 'Manuscript Management',
      description: 'Upload and track your manuscripts through every stage of the publishing process.',
    },
    {
      icon: TrendingUp,
      title: 'Sales Analytics',
      description: 'Real-time insights into your book sales, royalties, and reader engagement.',
    },
    {
      icon: Users,
      title: 'Author Community',
      description: 'Connect with fellow writers, share experiences, and grow together.',
    },
    {
      icon: PenTool,
      title: 'Writing Challenges',
      description: 'Participate in writing challenges to boost creativity and build discipline.',
    },
  ];

  const publishingSteps = [
    'Manuscript Upload',
    'Initial Review',
    'Professional Editing',
    'Cover Design',
    'Interior Formatting',
    'ISBN Assignment',
    'Distribution',
  ];

  const settings = homepageData?.settings || {};

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

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/shop" className="text-foreground/80 hover:text-primary transition">
              Shop
            </Link>
            <Link href="/free-publishing" className="text-foreground/80 hover:text-primary transition">
              Free Publishing
            </Link>
            <Link href="/writing-challenge" className="text-foreground/80 hover:text-primary transition">
              Writing Challenge
            </Link>
            <Link href="/blog" className="text-foreground/80 hover:text-primary transition">
              Blog
            </Link>
            <Link href="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b p-4 space-y-4">
            <Link href="/shop" className="block py-2">Shop</Link>
            <Link href="/free-publishing" className="block py-2">Free Publishing</Link>
            <Link href="/writing-challenge" className="block py-2">Writing Challenge</Link>
            <Link href="/blog" className="block py-2">Blog</Link>
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full">Log In</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Your Story Deserves
              <span className="text-gradient block mt-2">To Be Published</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A lightweight, professional publishing platform built for authors. 
              From manuscript to bookshelf—we handle the journey while you focus on writing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/free-publishing">
                <Button size="lg" className="text-lg px-8">
                  Start Free Publishing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/writing-challenge">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Join Writing Challenge
                </Button>
              </Link>
            </div>

            {/* Live Counter */}
            {settings.showLiveCounter && homepageData?.booksPublished !== undefined && (
              <div className="mt-12 inline-flex items-center gap-3 bg-card border rounded-full px-6 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-4xl font-bold text-primary animate-count-up">
                    {animatedCounter}+
                  </span>
                </div>
                <span className="text-muted-foreground">Books Published</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Releases Section */}
      {settings.showRecentReleases && homepageData?.recentReleases?.length > 0 && (
        <section className="py-16 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold">Recent Releases</h2>
                <p className="text-muted-foreground mt-1">Fresh off the press</p>
              </div>
              <Link href="/shop">
                <Button variant="outline">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {homepageData.recentReleases.map((book) => (
                <Link key={book.id} href={`/shop?book=${book.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      {book.coverImage ? (
                        <img 
                          src={book.coverImage} 
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Book className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-green-500">New</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {book.author?.name || 'Unknown'}
                      </p>
                      {book.category && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {book.category}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers Section */}
      {settings.showBestSellers && homepageData?.bestSellers?.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-yellow-500" />
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold">Best Sellers</h2>
                  <p className="text-muted-foreground mt-1">Reader favorites</p>
                </div>
              </div>
              <Link href="/shop?sort=bestseller">
                <Button variant="outline">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {homepageData.bestSellers.map((book, index) => (
                <Link key={book.id} href={`/shop?book=${book.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden relative">
                    {index < 3 && (
                      <div className="absolute top-0 left-0 z-10">
                        <div className={`
                          px-3 py-1 text-xs font-bold text-white
                          ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}
                        `}>
                          #{index + 1}
                        </div>
                      </div>
                    )}
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      {book.coverImage ? (
                        <img 
                          src={book.coverImage} 
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Book className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {book.author?.name || 'Unknown'}
                      </p>
                      {book.category && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {book.category}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete publishing ecosystem designed for modern authors
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Publishing Process */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Publishing Made Simple</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Track every stage of your book's journey from manuscript to marketplace
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:transform md:-translate-x-1/2" />
              
              {publishingSteps.map((step, index) => (
                <div key={index} className={`relative flex items-center mb-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                    <div className="ml-12 md:ml-0 p-4 bg-card rounded-lg border shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-primary">Step {index + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold mt-1">{step}</h3>
                    </div>
                  </div>
                  {/* Circle marker */}
                  <div className="absolute left-4 md:left-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center transform -translate-x-1/2 md:-translate-x-1/2">
                    <CheckCircle className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {homepageData?.reviews?.length > 0 && (
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Authors Say</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join our community of successful published authors
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {homepageData.reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-foreground/80 mb-4 line-clamp-4">{review.content}</p>
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

      {/* Packages Section */}
      {packages.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Publishing Packages</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose the right package for your publishing journey
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative ${pkg.isPopular ? 'border-primary shadow-lg scale-105' : ''}`}
                >
                  {pkg.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">₹{pkg.price.toLocaleString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center mb-6">{pkg.description}</p>
                    <ul className="space-y-3">
                      {(pkg.features || []).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-6" variant={pkg.isPopular ? 'default' : 'outline'}>
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 wine-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Share Your Story?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of authors who have successfully published with Writer's Pocket.
            Your literary journey starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Create Free Account
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white/10">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <PenTool className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold" style={{ fontFamily: 'Playfair Display' }}>
                  Writer's Pocket
                </span>
              </Link>
              <p className="text-muted-foreground text-sm">
                Professional publishing platform for authors who want to share their stories with the world.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/shop" className="hover:text-primary">Shop</Link></li>
                <li><Link href="/free-publishing" className="hover:text-primary">Free Publishing</Link></li>
                <li><Link href="/writing-challenge" className="hover:text-primary">Writing Challenge</Link></li>
                <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Authors</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Author Dashboard</Link></li>
                <li><Link href="/register" className="hover:text-primary">Create Account</Link></li>
                <li><Link href="/packages" className="hover:text-primary">Publishing Packages</Link></li>
                <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>support@writerspocket.com</li>
                <li>+91 98765 43210</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Writer's Pocket. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
