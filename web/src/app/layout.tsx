import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InspeksiPro — Sistem Inspeksi Limbah B3',
  description: 'Aplikasi Inspeksi Limbah B3 berbasis GPS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
