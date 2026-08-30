import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function EventsLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
