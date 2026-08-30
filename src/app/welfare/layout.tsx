import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function WelfareLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
