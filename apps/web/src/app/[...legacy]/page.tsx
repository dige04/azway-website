import { connection } from 'next/server';
import { movedOrNotFound } from '@/lib/redirect';

type Props = { params: Promise<{ legacy: string[] }> };

// Any path no route serves (D8): a redirect from the CMS list, else the 404
// page. Per request, not ISR, so crawler probes do not fill the page cache.
export default async function LegacyPath({ params }: Props) {
  await connection();
  return movedOrNotFound(...(await params).legacy);
}
