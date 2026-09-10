import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// Changelog entries: one MDX file per release under content/changelog, rendered
// newest-first on /docs/changelog and in its RSS feed (src/lib/changelog.ts).
export const changelog = defineDocs({
  dir: 'content/changelog',
  docs: {
    schema: pageSchema.extend({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'date must be YYYY-MM-DD'),
      version: z.string().regex(/^v\d+\.\d+\.\d+$/u, 'version must be vMAJOR.MINOR.PATCH'),
      tags: z.array(z.enum(['new-release', 'improvements', 'fixes'])).min(1),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
