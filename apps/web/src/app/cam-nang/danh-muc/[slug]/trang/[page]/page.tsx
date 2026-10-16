import { GuideList, guideListMetadata } from '@/components/article/GuideList';

export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string; page: string }[]> => [];

type Props = { params: Promise<{ slug: string; page: string }> };

export const generateMetadata = async ({ params }: Props) => {
  const { slug, page } = await params;
  return guideListMetadata({ category: slug, page });
};

export default async function Page({ params }: Props) {
  const { slug, page } = await params;
  return <GuideList category={slug} page={page} />;
}
