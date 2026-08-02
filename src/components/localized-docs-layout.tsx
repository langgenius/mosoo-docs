'use client';

import type { ReactNode } from 'react';
import type { Root } from 'fumadocs-core/page-tree';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { usePathname } from 'next/navigation';
import { baseOptions } from '@/lib/layout.shared';
import { getDocsLanguageFromPathname, type DocsLanguage } from '@/lib/i18n';

export function LocalizedDocsLayout({
  children,
  trees,
}: {
  children: ReactNode;
  trees: Record<DocsLanguage, Root>;
}) {
  const pathname = usePathname();
  const language = getDocsLanguageFromPathname(pathname);

  return (
    <DocsLayout tree={trees[language]} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
