import type { Article, Cruise, Tour } from './cms-types';
import { foldText, matchesQuery } from './text';

/** Longer input is cut, as on /tour. */
export const MAX_SEARCH_LENGTH = 100;

export interface SearchCatalogs {
  tours: Tour[];
  cruises: Cruise[];
  articles: Article[];
}

/** `?q=` of /tim-kiem: the first value, trimmed and cut; '' when absent. */
export function searchTerm(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * FR-SRC-03 /tim-kiem: tours by name or code, cruises by name, guide
 * articles by title. Every word must match, case and accents ignored; a tour
 * whose code is the whole query comes first ("LC2" before "LC20"). Runs on
 * the cached catalogs, so the visitor's words never reach Strapi.
 */
export function search(query: string, { tours, cruises, articles }: SearchCatalogs): SearchCatalogs {
  const q = query.trim();
  if (!q) return { tours: [], cruises: [], articles: [] };
  const isCode = (tour: Tour) => foldText(tour.code) === foldText(q);
  return {
    tours: tours.filter((tour) => matchesQuery(`${tour.name} ${tour.code}`, q)).sort((a, b) => Number(isCode(b)) - Number(isCode(a))),
    cruises: cruises.filter((cruise) => matchesQuery(cruise.name, q)),
    articles: articles.filter((article) => matchesQuery(article.title, q)),
  };
}
