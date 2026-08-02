import { source } from '@/lib/source';
import { LocalizedDocsLayout } from '@/components/localized-docs-layout';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <LocalizedDocsLayout
      trees={{
        en: source.getPageTree('en'),
        'zh-Hans': source.getPageTree('zh-Hans'),
        ja: source.getPageTree('ja'),
      }}
    >
      {children}
    </LocalizedDocsLayout>
  );
}
