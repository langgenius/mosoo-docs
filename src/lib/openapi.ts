import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  input: {
    en: './public/docs/openapi/mosoo-openapi.en.generated.json',
    'zh-Hans': './public/docs/openapi/mosoo-openapi.zh-Hans.generated.json',
  },
});
