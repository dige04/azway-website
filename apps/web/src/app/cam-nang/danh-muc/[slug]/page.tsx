import { GuideList, guideListMetadata } from '@/components/article/GuideList';

export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ slug: string }[]> => [];

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: Props) => guideListMetadata({ category: (await params).slug });

export default async function Page({ params }: Props) {
  return <GuideList category={(await params).slug} />;
}
