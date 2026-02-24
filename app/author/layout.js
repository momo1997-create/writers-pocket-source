'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PenTool,
  Book,
  BarChart3,
  FileText,
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AuthorLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check if logged in
    const storedUser = localStorage.getItem('wp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      // Fetch notifications
      fetch(`/api/notifications?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('wp_user');
    router.push('/login');
  };

  const navItems = [
    { href: '/author/dashboard', icon: BarChart3, label: 'Dashboard' },
    { href: '/author/books', icon: Book, label: 'My Books' },
    { href: '/author/queries', icon: MessageSquare, label: 'Queries' },
    { href: '/author/orders', icon: ShoppingBag, label: 'My Orders' },
    { href: '/author/royalties', icon: CreditCard, label: 'Royalties' },
    { href: '/author/profile', icon: User, label: 'Profile' },
    { href: '/author/settings', icon: Settings, label: 'Settings' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b px-4 h-14 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/author/dashboard" className="flex items-center space-x-2">
          <PenTool className="h-6 w-6 text-primary" />
          <span className="font-bold" style={{ fontFamily: 'Playfair Display' }}>Writer's Pocket</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/author/dashboard" className="flex items-center space-x-2">
            <PenTool className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-gradient" style={{ fontFamily: 'Playfair Display' }}>
              Writer's Pocket
            </span>
          </Link>
          <button className="lg:hidden p-2" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name || 'Author'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-6 h-16 items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Author Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <>
                    {notifications.slice(0, 5).map((notif) => (
                      <DropdownMenuItem 
                        key={notif.id} 
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                        onClick={() => {
                          // Mark as read
                          fetch('/api/notifications/read', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notificationIds: [notif.id] }),
                          });
                          // Navigate if link exists
                          if (notif.link) {
                            router.push(notif.link);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="font-medium flex-1">{notif.title}</span>
                          {!notif.isRead && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground line-clamp-2">{notif.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    {notifications.length > 5 && (
                      <div className="p-2 text-center border-t">
                        <Link href="/author/notifications" className="text-sm text-primary hover:underline">
                          View all notifications
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-32 truncate">{user.name || 'Author'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/author/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/author/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
