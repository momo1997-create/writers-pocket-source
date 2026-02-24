import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: "Writer's Pocket - Publishing Platform for Authors",
  description: 'A lightweight, high-performance publishing platform for authors. Upload manuscripts, track publishing stages, manage royalties, and more.',
  keywords: 'publishing, authors, manuscripts, books, self-publishing, writing',
  authors: [{ name: "Writer's Pocket" }],
  openGraph: {
    title: "Writer's Pocket",
    description: 'Professional Publishing Platform for Authors',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
