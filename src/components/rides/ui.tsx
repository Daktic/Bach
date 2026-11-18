import { formatActivityTime } from "~/lib/activity-time";
import type { CrewMemberView } from "~/lib/types";
import { formatCalendarDate } from "~/lib/zoned-time";

// Shared bits for the rides page (ADR 0012).

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal";

export const primaryButton =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-charcoal px-4 text-sm font-semibold
   text-cream transition-transform active:scale-[0.98] disabled:opacity-50 ${focusRing}`;

export const secondaryButton =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-charcoal/20 bg-cream/60 px-4
   text-sm font-semibold text-charcoal transition-transform active:scale-[0.98] hover:bg-charcoal/5
   disabled:opacity-50 ${focusRing}`;

export const textButton =
  `inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-charcoal/75 underline
   underline-offset-2 hover:text-charcoal disabled:opacity-50 ${focusRing}`;

/** Looks guests up by id; falls back to the id for someone off the roster. */
export type CrewLookup = (id: string) => { name: string; initials: string; image?: string };

export function crewLookup(crew: readonly CrewMemberView[] | undefined): CrewLookup {
  const byId = new Map((crew ?? []).map((c) => [c.id, c]));
  return (id) => byId.get(id) ?? { name: id, initials: id.slice(0, 2).toUpperCase() };
}

/** "Thu, Apr 8" from "2027-04-08T15:00". */
export const rideDay = (departAt: string) =>
  formatCalendarDate(departAt.slice(0, 10), { weekday: "short", month: "short", day: "numeric" });

/** "3:00 PM" from "2027-04-08T15:00" (Arizona time, never shifted). */
export const rideTime = (departAt: string) => formatActivityTime(departAt.slice(11, 16));

/** "Kyle", "Kyle and Matt", "Kyle, Matt and Phil". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * What a thing a finger holds must not do: show iOS's image or text callout,
 * or select. Goes on chips, seats and the car body.
 */
export const holdable = "select-none [-webkit-touch-callout:none]";

/** A small round photo or initials, beside a name that's always written out. */
export function Face(props: { initials: string; image?: string; size?: "sm" | "md" | "lg"; class?: string }) {
  const size = () =>
    props.size === "lg" ? "h-11 w-11 text-xs" : props.size === "md" ? "h-9 w-9 text-[11px]" : "h-7 w-7 text-[10px]";
  return (
    <span
      aria-hidden="true"
      class={`paper-card inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full
              ring-1 ring-charcoal/15 ${holdable} ${size()} ${props.class ?? ""}`}
    >
      {props.image ? (
        // The photo is decoration: a long press on it must reach the chip, not open the image.
        <img
          src={props.image}
          alt=""
          draggable={false}
          referrerpolicy="no-referrer"
          class={`pointer-events-none h-full w-full object-cover ${holdable}`}
        />
      ) : (
        <span class="select-none font-bold text-charcoal/75">{props.initials}</span>
      )}
    </span>
  );
}
