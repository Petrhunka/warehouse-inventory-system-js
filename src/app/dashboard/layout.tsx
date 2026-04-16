import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Stocktaking Dashboard',
  description: 'Live progress dashboard for ongoing warehouse stocktaking',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}
