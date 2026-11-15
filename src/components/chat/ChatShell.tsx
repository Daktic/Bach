import { For, type JSX, type ParentProps } from "solid-js";

// Static frame for /chat, safe to render on the server: the route shows it
// with skeletons while the client-only chat loads, so nothing jumps on swap.
// It fills the screen under the nav, so the message box sits at the bottom
// even when the thread is short. The bar with everyone's circles stays put
// under the nav while the thread scrolls.

export function ChatShell(props: ParentProps<{ status?: JSX.Element; people?: JSX.Element }>) {
  return (
    <div class="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-lg flex-col px-3">
      <div class="paper-surface sticky top-14 z-20 -mx-3 border-b border-charcoal/10 px-3 pb-2 pt-2.5">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h1 class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">Crew chat</h1>
          {props.status}
        </div>
        {props.people ?? <PeopleSkeleton />}
      </div>
      {props.children}
    </div>
  );
}

function PeopleSkeleton() {
  return (
    <div aria-hidden="true" class="flex gap-3 overflow-hidden pb-0.5">
      <For each={Array.from({ length: 8 })}>
        {() => (
          <div class="flex w-11 shrink-0 flex-col items-center gap-1">
            <div class="h-10 w-10 animate-pulse rounded-full bg-charcoal/10" />
            <div class="h-2.5 w-8 animate-pulse rounded bg-charcoal/10" />
          </div>
        )}
      </For>
    </div>
  );
}

/** A few grey bubbles and the message box, while the chat loads. */
export function ChatSkeleton() {
  const bubble = "h-9 animate-pulse rounded-[18px]";
  return (
    <>
      <p role="status" class="sr-only">
        Loading the chat…
      </p>
      <div aria-hidden="true" class="flex flex-1 flex-col justify-end gap-2 pb-4">
        <div class={`${bubble} ml-9 w-2/3 bg-charcoal/[0.08]`} />
        <div class={`${bubble} ml-9 w-1/2 bg-charcoal/[0.08]`} />
        <div class={`${bubble} ml-auto w-3/5 bg-teal/30`} />
        <div class={`${bubble} ml-9 w-2/5 bg-charcoal/[0.08]`} />
      </div>
      <div aria-hidden="true" class="sticky bottom-0 pb-3 pt-2">
        <div class="h-11 rounded-[22px] border border-charcoal/15 bg-white/50" />
      </div>
    </>
  );
}
