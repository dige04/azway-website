import type { TocEntry } from '@/lib/article';

const TITLE = 'Trong bài viết này';
const titleClass = 'text-[13px] font-extrabold text-navy';

/**
 * FR-BLG-02 table of contents, numbered like the design's `.toc`. `summary`:
 * the title is the <summary> of a surrounding <details> (phones).
 */
export function TableOfContents({ entries, summary = false }: { entries: TocEntry[]; summary?: boolean }) {
  let number = 0;
  return (
    <>
      {summary ? (
        <summary className={`cursor-pointer list-none [&::-webkit-details-marker]:hidden ${titleClass}`}>{TITLE}</summary>
      ) : (
        <p className={titleClass}>{TITLE}</p>
      )}
      <ol className="mt-3">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? 'pl-[25px]' : undefined}>
            <a href={`#${entry.id}`} className="grid grid-cols-[16px_1fr] gap-2.5 py-1.5 text-[13px] leading-[1.6] text-muted hover:text-red">
              <span aria-hidden="true" className="mt-px text-[10px] text-[#a5afbd]">
                {entry.level === 2 ? String(++number).padStart(2, '0') : '–'}
              </span>
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
