'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthorAutoLogin() {
  const router = useRouter();

  useEffect(() => {
    // Set author user in localStorage
    const authorUser = {
      id: 'auto-author',
      email: 'author@writerspocket.com',
      name: 'Test Author',
      role: 'AUTHOR',
      authorUid: 'WP-AUTH-000005',
      isBlogWriter: false,
    };
    
    localStorage.setItem('wp_user', JSON.stringify(authorUser));
    
    // Redirect to author dashboard
    router.push('/author/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Logging in as Author...</p>
      </div>
    </div>
  );
}
