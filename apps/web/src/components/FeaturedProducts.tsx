import { connection } from 'next/server';
import { cruiseCard, ProductCard, tourCard } from '@/components/ProductCard';
import { getHomepage } from '@/lib/cms';

/**
 * SEO-08: the home page's featured tours (3) and a cruise, for the 404 and a
 * search without results. A CMS failure hides the block, but never into the
 * cache: as in loadSiteSetting, `connection()` stops a static/ISR render so
 * Next keeps the cached page; only a per-request render goes on without it.
 */
export async function FeaturedProducts({ title = 'Sản phẩm nổi bật' }: { title?: string }) {
  const homepage = await getHomepage().catch(async (error: unknown) => {
    console.error('[featured-products] unavailable:', error instanceof Error ? error.message : error);
    await connection();
    return null;
  });
  const products = [...(homepage?.featuredTours ?? []).slice(0, 3).map(tourCard), ...(homepage?.featuredCruises ?? []).slice(0, 1).map(cruiseCard)];
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="san-pham-noi-bat" className="mt-14 border-t-2 border-navy pt-6">
      <h2 id="san-pham-noi-bat" className="mb-6 text-[27px] font-bold leading-snug tracking-[-0.03em] text-navy">
        {title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.href} product={product} />
        ))}
      </div>
    </section>
  );
}
