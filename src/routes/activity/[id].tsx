import { A, createAsync, useParams } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { ErrorBoundary, Show, Suspense } from "solid-js";
import { ActivityDetails } from "~/components/timeline/ActivityDetails";
import { ShareButton } from "~/components/timeline/ShareButton";
import { getActivity } from "~/lib/api/activities";

// Shareable deep link to one activity (TL-7). Same details as the timeline
// dialog, rendered on the server so the link works on a cold load.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4" aria-hidden="true">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

const homeButtonClass =
  "mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-charcoal px-5 text-sm font-semibold text-cream";

function NotFound() {
  return (
    <div class="mt-2 rounded-xl paper-card px-5 py-10 text-center">
      <HttpStatusCode code={404} />
      <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">Lost in the desert</p>
      <h1 class="mt-1 text-2xl font-black text-charcoal">Activity not found</h1>
      <p class="mt-2 text-sm leading-relaxed text-charcoal/75">
        That link doesn't match anything on the itinerary. It may have been renamed or dropped.
      </p>
      <A href="/" class={homeButtonClass}>
        See the full timeline
      </A>
    </div>
  );
}

function LoadError() {
  return (
    <div class="mt-2 rounded-xl paper-card px-5 py-10 text-center">
      <h1 class="text-lg font-black text-charcoal">Couldn't load this activity</h1>
      <p class="mt-1 text-sm text-charcoal/75">Check your connection, then try again.</p>
      <button type="button" onClick={() => window.location.reload()} class={homeButtonClass}>
        Reload
      </button>
    </div>
  );
}

export default function ActivityPage() {
  const params = useParams<{ id: string }>();
  const data = createAsync(async () => {
    const result = await getActivity(params.id);
    // Unknown ids come back as null. An expired session throws (401); an
    // empty response is a failure too, not "not found".
    if (result === undefined) throw new Error("Couldn't load this activity");
    return result;
  });

  return (
    <div class="mx-auto max-w-lg px-4 pb-10 pt-2">
      <A
        href="/"
        class="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-charcoal/75 transition-colors hover:text-charcoal"
      >
        <BackIcon />
        Timeline
      </A>

      <ErrorBoundary fallback={<LoadError />}>
        <Suspense
          fallback={<p class="py-16 text-center text-sm text-charcoal/75">Loading activity…</p>}
        >
          <Show when={data()} fallback={<NotFound />}>
            {(found) => (
              <article class="mt-2 overflow-hidden rounded-xl paper-card">
                <ActivityDetails activity={found().activity} headingLevel="h1" />
                <div class="px-5 pb-5">
                  <ShareButton
                    path={`/activity/${encodeURIComponent(found().activity.id)}`}
                    title={found().activity.title}
                    class="w-full"
                  />
                </div>
              </article>
            )}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
