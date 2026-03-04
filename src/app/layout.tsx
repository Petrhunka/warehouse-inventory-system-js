import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Warehouse Inventory System',
  description: 'Interactive warehouse management tool with 3D visualization and inventory analytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
