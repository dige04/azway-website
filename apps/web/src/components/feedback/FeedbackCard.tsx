import Link from 'next/link';
import { Show } from '@/components/Show';
import type { Feedback } from '@/lib/cms-types';
import { galleryImages } from '@/lib/gallery';
import { FeedbackAlbum } from './FeedbackAlbum';

const dateFormat = new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' });

/** FR-GEN-03: one group, its note and its whole photo album. */
export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  // Albums may hold videos; Next's <Image> shows photos only.
  const photos = galleryImages(feedback.groupName, null, feedback.album?.filter((media) => media.mime.startsWith('image/')));
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
      <Show when={photos}>{(items) => <FeedbackAlbum photos={items} title={feedback.groupName} />}</Show>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {feedback.date && <p className="text-sm font-bold text-red">{dateFormat.format(new Date(feedback.date))}</p>}
        <h3 className="text-lg font-bold leading-snug text-navy">{feedback.groupName}</h3>
        {feedback.organization && <p className="text-sm text-label">{feedback.organization}</p>}
        {feedback.description && <p className="text-sm text-muted">{feedback.description}</p>}
        {feedback.tour && (
          <Link href={`/tour/${feedback.tour.slug}`} className="mt-auto pt-2 text-sm font-bold text-navy underline underline-offset-4 hover:text-red">
            {feedback.tour.name}
          </Link>
        )}
      </div>
    </article>
  );
}
