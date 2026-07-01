#!/usr/bin/env node

import { cp, mkdir } from 'node:fs/promises';

await mkdir('out/docs', { recursive: true });
await cp('out/_next', 'out/docs/_next', { force: true, recursive: true });
