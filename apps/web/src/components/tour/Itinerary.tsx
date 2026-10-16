import type { ItineraryDay } from '@/lib/cms-types';
import { hasContent } from '@/lib/present';

const MEALS = [
  ['breakfast', 'Bữa sáng'],
  ['lunch', 'Bữa trưa'],
  ['dinner', 'Bữa tối'],
] as const;

/** FR-PRD-02: the programme day by day, each day as a timeline of stops. */
export function Itinerary({ days }: { days: ItineraryDay[] }) {
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  return (
    <ol className="grid gap-5">
      {sorted.map((day) => {
        const meals = MEALS.filter(([key]) => day[key]).map(([, label]) => label);
        const stops = (day.milestones ?? []).filter((stop) => hasContent(stop.title));
        return (
          <li key={day.id} className="rounded-card border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <h3 className="text-xl font-bold text-navy">
                <span className="mr-2 text-red">Ngày {day.dayNumber}</span>
                {day.title}
              </h3>
              {meals.length > 0 && (
                <ul aria-label="Bữa ăn" className="flex flex-wrap gap-1.5 text-xs font-bold text-success">
                  {meals.map((meal) => (
                    <li key={meal} className="rounded-full bg-success-soft px-2.5 py-1">
                      {meal}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {stops.length > 0 && (
              <ol className="mt-5 grid gap-0 border-l-2 border-red-soft pl-5">
                {stops.map((stop) => (
                  <li key={stop.id} className="relative pb-5 last:pb-0">
                    <span aria-hidden="true" className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-white bg-red" />
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <time className="font-bold tabular-nums text-red-dark">{stop.time}</time>
                      <strong className="text-ink">{stop.title}</strong>
                    </p>
                    {stop.description && <p className="mt-1 text-[15px] text-ink-2">{stop.description}</p>}
                    {stop.note && <p className="mt-1.5 text-sm italic text-muted">Ghi chú: {stop.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}
