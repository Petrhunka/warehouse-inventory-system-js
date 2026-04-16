import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Stocktaking · Warehouse Worker',
  description: 'Mobile-friendly stocktaking app for warehouse workers',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
}
