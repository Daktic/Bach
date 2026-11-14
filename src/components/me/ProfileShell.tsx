import type { ParentProps } from "solid-js";

// Static frame for /me. Safe to render on the server: the route shows it with
// a skeleton while the client-only profile loads, so nothing jumps on swap.
// The title block is a <div>, not a <header>: the page renders inside
// AppShell's <main>, and NavBar's <header> is the page's only one.

export function ProfileShell(props: ParentProps) {
  return (
    <div class="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 class="text-2xl font-black text-charcoal">My Profile</h1>
        <p class="mt-1 text-sm text-charcoal/75">Your name, photo and travel plans.</p>
      </div>
      {props.children}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div class="space-y-6">
      <div class="paper-card flex flex-col items-center gap-3 rounded-xl p-5">
        <p role="status" class="sr-only">Loading your profile…</p>
        <div aria-hidden="true" class="h-24 w-24 animate-pulse rounded-full bg-charcoal/10" />
        <div aria-hidden="true" class="h-5 w-32 animate-pulse rounded-md bg-charcoal/10" />
        <div aria-hidden="true" class="h-3 w-48 animate-pulse rounded-md bg-charcoal/10" />
      </div>
      <div aria-hidden="true" class="paper-card space-y-3 rounded-xl p-4">
        <div class="h-3 w-24 animate-pulse rounded-md bg-charcoal/10" />
        <div class="h-11 animate-pulse rounded-xl bg-charcoal/10" />
        <div class="h-24 animate-pulse rounded-xl bg-charcoal/10" />
      </div>
    </div>
  );
}
