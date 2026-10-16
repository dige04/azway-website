import type { Core } from '@strapi/strapi';

export function assertLocalTarget(env: Record<string, string | undefined>): void;

export function seed(
  strapi: Core.Strapi,
  options: { assetsDir: string; skipUnverified?: boolean },
): Promise<{ summary: Record<string, { created: number; updated: number; kept: number }>; warnings: string[] }>;
