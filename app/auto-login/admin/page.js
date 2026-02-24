'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAutoLogin() {
  const router = useRouter();

  useEffect(() => {
    // Set admin user in localStorage
    const adminUser = {
      id: 'auto-admin',
      email: 'admin@writerspocket.com',
      name: 'Admin User',
      role: 'ADMIN',
      authorUid: 'WP-AUTH-000004',
      isBlogWriter: true,
    };
    
    localStorage.setItem('wp_user', JSON.stringify(adminUser));
    
    // Redirect to admin dashboard
    router.push('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Logging in as Admin...</p>
      </div>
    </div>
  );
}
