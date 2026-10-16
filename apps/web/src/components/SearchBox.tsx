import { SEARCH_HREF } from '@/components/layout/nav';
import { MAX_SEARCH_LENGTH } from '@/lib/search';

/** The design's search row (`.search-input-row`): a plain GET to /tim-kiem?q=, works without JS. */
export function SearchBox({ defaultValue, className = '' }: { defaultValue?: string; className?: string }) {
  return (
    <form action={SEARCH_HREF} role="search" className={`flex flex-col gap-3 xs:flex-row ${className}`}>
      <label className="flex min-h-[52px] flex-1 items-center gap-2.5 rounded-control border border-[#c2cbd9] bg-white px-3.5 focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-[#ff8090]">
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-[#8090a4]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">Từ khóa tìm kiếm</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Tên tour, mã tour, du thuyền, bài viết…"
          maxLength={MAX_SEARCH_LENGTH}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>
      <button type="submit" className="min-h-[52px] rounded-button bg-navy px-6 font-bold text-white hover:bg-navy-2">
        Tìm kiếm
      </button>
    </form>
  );
}
