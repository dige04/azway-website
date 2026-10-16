import { GuideList, guideListMetadata } from '@/components/article/GuideList';
import { renderPerRequestWithoutCms } from '@/lib/build';

// Static + ISR (NFR-03, D4), like the home page; pages 2+ live at /cam-nang/trang/N.
export const revalidate = 3600;

export const generateMetadata = () => guideListMetadata({});

export default async function Page() {
  await renderPerRequestWithoutCms();
  return <GuideList />;
}
