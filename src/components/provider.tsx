'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { type ReactNode } from 'react';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { translations } from '@/lib/layout.shared';
import { usePathname, useRouter } from 'next/navigation';
import { getDocsLanguageFromPathname, getLocalizedDocsPath } from '@/lib/i18n';

export function Provider({
  children,
  docsPaths,
}: {
  children: ReactNode;
  docsPaths: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentLanguage = getDocsLanguageFromPathname(pathname);
  const provider = i18nProvider(translations, currentLanguage);

  return (
    <RootProvider
      search={{ SearchDialog }}
      i18n={{
        ...provider,
        onLocaleChange(locale) {
          router.push(
            getLocalizedDocsPath(
              pathname,
              locale === 'zh-Hans' ? 'zh-Hans' : 'en',
              docsPaths,
            ),
          );
        },
      }}
    >
      {children}
    </RootProvider>
  );
}
