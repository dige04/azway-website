import { defineConfig } from 'vitest/config';

// Integration tests each boot Strapi, and compileStrapi() writes dist/: run
// test files one after another so two boots never compile at once.
export default defineConfig({ test: { fileParallelism: false } });
