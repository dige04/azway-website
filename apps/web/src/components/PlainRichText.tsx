import type { BlocksContent } from '@/lib/cms-types';

// TEMPORARY until #10 merges: same API as its components/RichText.tsx, which
// replaces this file (each block's text as a paragraph; no links, lists, images).

const text = (node: unknown): string => {
  if (!node || typeof node !== 'object') return '';
  const { text: value, children } = node as { text?: unknown; children?: unknown[] };
  return typeof value === 'string' ? value : (children ?? []).map(text).join('');
};

export function RichText({ content, className = '' }: { content: BlocksContent | null | undefined; className?: string }) {
  const paragraphs = (content ?? []).map(text).filter((value) => value.trim());
  if (paragraphs.length === 0) return null;
  return (
    <div className={className}>
      {paragraphs.map((value, index) => (
        <p key={index}>{value}</p>
      ))}
    </div>
  );
}
