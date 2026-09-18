import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  input: {
    'en-v2': './public/docs/openapi/mosoo-openapi.v2.en.generated.json',
    'zh-Hans-v2': './public/docs/openapi/mosoo-openapi.v2.zh-Hans.generated.json',
    'ja-v2': './public/docs/openapi/mosoo-openapi.v2.ja.generated.json',
    en: './public/docs/openapi/mosoo-openapi.en.generated.json',
    'zh-Hans': './public/docs/openapi/mosoo-openapi.zh-Hans.generated.json',
    ja: './public/docs/openapi/mosoo-openapi.ja.generated.json',
  },
});
