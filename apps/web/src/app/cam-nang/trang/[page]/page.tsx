import { GuideList, guideListMetadata } from '@/components/article/GuideList';

export const revalidate = 3600;
export const generateStaticParams = async (): Promise<{ page: string }[]> => [];

type Props = { params: Promise<{ page: string }> };

export const generateMetadata = async ({ params }: Props) => guideListMetadata(await params);

export default async function Page({ params }: Props) {
  return <GuideList {...await params} />;
}
