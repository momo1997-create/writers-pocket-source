'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  PenTool,
  LayoutDashboard,
  Book,
  Users,
  MessageSquare,
  UserPlus,
  ShoppingCart,
  DollarSign,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Package,
  FileText,
  FolderTree,
  Newspaper,
  BookOpen,
  Upload,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('wp_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // For demo purposes, allow any logged-in user to access admin
      // In production, check role === 'ADMIN' || role === 'TEAM'
      setUser(userData);
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('wp_user');
    router.push('/login');
  };

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/books', icon: Book, label: 'All Books' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/categories', icon: FolderTree, label: 'Categories' },
    { href: '/admin/blog', icon: Newspaper, label: 'Blog' },
    { href: '/admin/anthology', icon: BookOpen, label: 'Anthology' },
    { href: '/admin/queries', icon: MessageSquare, label: 'Queries' },
    { href: '/admin/leads', icon: UserPlus, label: 'CRM / Leads' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { href: '/admin/sales', icon: TrendingUp, label: 'Sales & Royalties' },
    { href: '/admin/packages', icon: Package, label: 'Packages' },
    { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { href: '/admin/import', icon: Upload, label: 'Bulk Import' },
    { href: '/admin/content', icon: FileText, label: 'Content' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
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
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <PenTool className="h-6 w-6 text-primary" />
          <span className="font-bold">Admin</span>
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {user?.name?.charAt(0) || 'A'}
          </AvatarFallback>
        </Avatar>
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
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700 flex-shrink-0">
          <Link href="/admin/dashboard" className="flex items-center space-x-2">
            <PenTool className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold">Admin Panel</span>
          </Link>
          <button className="lg:hidden p-2" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-32">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        <header className="hidden lg:flex sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-6 h-16 items-center justify-between">
          <h2 className="text-lg font-semibold">Admin Dashboard</h2>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">View Site</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-32 truncate">{user?.name || 'Admin'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
