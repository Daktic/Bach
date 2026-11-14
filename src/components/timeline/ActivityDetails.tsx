import { A } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { formatActivityDate, formatActivityTimeRange } from "~/lib/activity-time";
import { mapsProviderFor, mapsSearchUrl, type MapsProvider } from "~/lib/maps";
import type { ActivityView } from "~/lib/types";

// Everything about one activity (TL-3/4/5). Shared by the timeline dialog and
// the /activity/[id] page; the parent supplies the card surface and actions.

interface Props {
  activity: ActivityView;
  /** h2 inside the dialog, h1 on the activity's own page. */
  headingLevel?: "h1" | "h2";
}

export function activityTitleId(id: string): string {
  return `activity-${id}-title`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 text-teal" aria-hidden="true">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 text-orange" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 text-teal" aria-hidden="true">
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0 text-charcoal/35" aria-hidden="true">
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 text-charcoal/35" aria-hidden="true">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

// ─── Details ──────────────────────────────────────────────────────────────────

const rowClass = "flex min-h-11 items-center gap-3 px-3 py-2.5";
const linkRowClass = `${rowClass} transition-colors hover:bg-charcoal/5 active:bg-charcoal/8`;

export function ActivityDetails(props: Props) {
  // SSR and the first client render link to Google Maps so hydration matches;
  // iPhones and iPads switch to Apple Maps once mounted.
  const [mapsProvider, setMapsProvider] = createSignal<MapsProvider>("google");
  onMount(() => setMapsProvider(mapsProviderFor(navigator)));

  const timeRange = () =>
    formatActivityTimeRange(props.activity.startTime, props.activity.endTime);
  const location = () => props.activity.location?.trim() || undefined;
  const hasFacts = () => Boolean(timeRange() || location() || props.activity.pool);

  return (
    <>
      <Show
        when={props.activity.image}
        fallback={<div class="h-24 w-full bg-gradient-to-br from-teal/40 to-orange/20" />}
      >
        {(src) => (
          <div class="h-48 w-full overflow-hidden bg-gradient-to-br from-teal/40 to-orange/20">
            <img src={src()} alt="" class="h-full w-full object-cover" />
          </div>
        )}
      </Show>

      <div class="p-5">
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/80">
          {formatActivityDate(props.activity.day)}
        </p>
        <Dynamic
          component={props.headingLevel ?? "h2"}
          id={activityTitleId(props.activity.id)}
          class="mt-1 text-2xl font-black leading-tight text-charcoal wrap-break-word"
        >
          {props.activity.title}
        </Dynamic>

        <Show when={hasFacts()}>
          <ul class="mt-4 divide-y divide-charcoal/10 overflow-hidden rounded-xl border border-charcoal/10 bg-white/40">
            <Show when={timeRange()}>
              {(range) => (
                <li class={rowClass}>
                  <ClockIcon />
                  <span class="text-sm font-semibold text-charcoal">{range()}</span>
                </li>
              )}
            </Show>

            <Show when={location()}>
              {(place) => (
                <li>
                  <a
                    href={mapsSearchUrl(place(), mapsProvider())}
                    target="_blank"
                    rel="noopener noreferrer"
                    class={linkRowClass}
                  >
                    <PinIcon />
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-semibold text-charcoal wrap-break-word">
                        {place()}
                      </span>
                      {/* Orange is too light for small text; it stays on the underline. */}
                      <span class="mt-0.5 block text-xs font-bold text-charcoal/80 underline decoration-orange decoration-2 underline-offset-2">
                        Open in Maps
                      </span>
                    </span>
                    <ExternalIcon />
                  </a>
                </li>
              )}
            </Show>

            <Show when={props.activity.pool}>
              {(pool) => (
                <li>
                  <A href={`/funds/${encodeURIComponent(pool().id)}`} class={linkRowClass}>
                    <WalletIcon />
                    <span class="min-w-0 flex-1 text-sm text-charcoal/75">
                      Paid from:{" "}
                      <span class="font-semibold text-charcoal">{pool().title}</span>
                    </span>
                    <ChevronIcon />
                  </A>
                </li>
              )}
            </Show>
          </ul>
        </Show>

        <p class="mt-4 whitespace-pre-line text-sm leading-relaxed text-charcoal/80 wrap-break-word">
          {props.activity.details ?? props.activity.description}
        </p>
      </div>
    </>
  );
}
