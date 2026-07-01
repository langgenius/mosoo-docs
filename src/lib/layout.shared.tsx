import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { docsRoute, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-baseline gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/docs/images/brand/logo-wordmark-onlight.svg"
            alt="mosoo"
            className="h-[17px] w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/docs/images/brand/logo-wordmark-ondark.svg"
            alt="mosoo"
            className="hidden h-[17px] w-auto dark:block"
          />
          <span className="font-display text-[15px] font-medium tracking-tight text-fd-muted-foreground">
            docs
          </span>
        </span>
      ),
      url: docsRoute,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
