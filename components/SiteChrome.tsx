'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function SiteChrome({ children, forceMega = false }: { children: React.ReactNode; forceMega?: boolean }) {
  const pathname = usePathname();
  if (forceMega || pathname?.startsWith('/mega')) return <>{children}</>;
  return <><Header/><main>{children}</main><Footer/></>;
}
