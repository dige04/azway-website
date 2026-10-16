/**
 * schema.org JSON-LD (SEO-04). The layout puts the TravelAgency on every
 * page; others refer to it by `@id` as provider / publisher.
 */
import type { Article, Cruise, CruiseOption, SiteSetting, Tour } from './cms-types';
import { mediaUrl } from './media';
import { safeHref } from './present';
import { SITE_NAME, siteUrl } from './site';

const CONTEXT = 'https://schema.org';
const ORGANIZATION_ID = () => siteUrl('/#organization');
/** The agency where another item names it (provider, seller, author, publisher). */
const organizationRef = () => ({ '@type': 'TravelAgency', '@id': ORGANIZATION_ID(), name: SITE_NAME, url: siteUrl('/'), logo: siteUrl('/logo-azway.png') });
const images = (...urls: (string | null | undefined)[]) => urls.map(mediaUrl).filter((url): url is string => !!url);

export function travelAgency(setting: SiteSetting | null) {
  const sameAs = [setting?.facebookUrl, setting?.youtubeUrl, setting?.tiktokUrl].map(safeHref).filter(Boolean);
  return {
    '@context': CONTEXT,
    '@type': 'TravelAgency',
    '@id': ORGANIZATION_ID(),
    name: SITE_NAME,
    url: siteUrl('/'),
    logo: siteUrl('/logo-azway.png'),
    image: siteUrl('/logo-azway.png'),
    telephone: setting?.hotline?.trim() || undefined,
    email: setting?.email?.trim() || undefined,
    // One address per line (head office, branches); schema.org takes text.
    address: setting?.address?.split('\n').map((line) => line.trim()).filter(Boolean),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/** Per-guest offers (VND); "Liên hệ báo giá" (0 / empty) and charters carry none. */
function offers(prices: { name?: string; price: number | null }[], url: string) {
  const priced = prices.filter((item): item is { name?: string; price: number } => !!item.price && item.price > 0);
  if (priced.length === 0) return undefined;
  return priced.map(({ name, price }) => ({ '@type': 'Offer', name, price, priceCurrency: 'VND', url, seller: organizationRef() }));
}

export function touristTrip(tour: Tour, description: string | undefined) {
  const url = siteUrl(`/tour/${tour.slug}`);
  return {
    '@context': CONTEXT,
    '@type': 'TouristTrip',
    name: tour.name,
    description,
    url,
    identifier: tour.code,
    image: images(tour.thumbnail?.url, ...(tour.gallery ?? []).map((item) => item.url)),
    provider: organizationRef(),
    itinerary: tour.itinerary?.length
      ? { '@type': 'ItemList', itemListElement: tour.itinerary.map((day) => ({ '@type': 'ListItem', position: day.dayNumber, name: day.title })) }
      : undefined,
    offers: offers([{ price: tour.priceFrom }], url),
  };
}

/** A Ha Long cruise is sold as day trips and dinners: a TouristTrip with an offer per option. */
export function cruiseTrip(cruise: Cruise, description: string | undefined) {
  const url = siteUrl(`/du-thuyen/${cruise.slug}`);
  return {
    '@context': CONTEXT,
    '@type': 'TouristTrip',
    name: `Du thuyền ${cruise.name}`,
    description,
    url,
    image: images(cruise.thumbnail?.url, ...(cruise.gallery ?? []).map((item) => item.url)),
    provider: organizationRef(),
    offers: offers((cruise.options ?? []).map((option: CruiseOption) => ({ name: option.name, price: option.price })), url),
  };
}

export function articleLd(article: Article, description: string | undefined) {
  const author = article.author?.trim();
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: article.title,
    description,
    url: siteUrl(`/cam-nang/${article.slug}`),
    mainEntityOfPage: siteUrl(`/cam-nang/${article.slug}`),
    image: images(article.cover?.url),
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt,
    // The seed and most posts are by the agency itself.
    author: !author || author === SITE_NAME ? organizationRef() : { '@type': 'Person', name: author },
    publisher: organizationRef(),
  };
}
