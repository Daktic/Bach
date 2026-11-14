import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";

// Catch-all for paths no other route matches (a mistyped or out-of-date
// link), so they get a 404 and a way back instead of a blank page. Same
// look as an unknown activity (routes/activity/[id].tsx).
export default function NotFoundPage() {
  return (
    <div class="mx-auto max-w-lg px-4 py-6">
      <div class="rounded-xl paper-card px-5 py-10 text-center">
        <HttpStatusCode code={404} />
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">Lost in the desert</p>
        <h1 class="mt-1 text-2xl font-black text-charcoal">Page not found</h1>
        <p class="mt-2 text-sm leading-relaxed text-charcoal/75">
          That link doesn't go anywhere on the site. It may have a typo, or the page may have moved.
        </p>
        <A
          href="/"
          class="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-charcoal px-5 text-sm font-semibold text-cream"
        >
          See the full timeline
        </A>
      </div>
    </div>
  );
}
