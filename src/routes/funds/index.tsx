import { createAsync, query, type RouteDefinition } from "@solidjs/router";
import { ErrorBoundary, For, Show, Suspense } from "solid-js";
import { FundingCard } from "~/components/funds/FundingCard";
import { FundsMessage, LoadFailed } from "~/components/funds/FundsMessage";
import { PaidUpHeader } from "~/components/funds/PaidUpHeader";
import { getMyPools } from "~/lib/api/funds";
import { createNow } from "~/lib/client/clock";
import type { PoolView } from "~/lib/types";

// Wrapped in query() so the route can preload it, a redirect from the server
// is followed, and a future payment flow can revalidate the "myPools" key.
const myPools = query(() => getMyPools(), "myPools");

export const route = {
  preload: () => myPools(),
} satisfies RouteDefinition;

function PoolList(props: { pools: PoolView[] }) {
  // Time-based state (FN-8 overdue) starts after mount: SSR and hydration
  // render the same markup, and the dev ?mockDate param is honoured. It keeps
  // ticking, so a page left open past a due date turns overdue.
  const now = createNow();

  return (
    <Show
      when={props.pools.length > 0}
      fallback={
        <FundsMessage
          title="No pools yet"
          body="Shared costs show up here once the organiser adds them."
        />
      }
    >
      <PaidUpHeader pools={props.pools} now={now()} />
      <div class="space-y-5">
        <For each={props.pools}>{(pool) => <FundingCard pool={pool} now={now()} />}</For>
      </div>
    </Show>
  );
}

function FundsSkeleton() {
  return (
    <div class="space-y-5">
      <span class="sr-only">Loading funds…</span>
      <div aria-hidden="true" class="paper-card h-20 animate-pulse rounded-xl" />
      <div aria-hidden="true" class="paper-card h-80 animate-pulse rounded-2xl" />
      <div aria-hidden="true" class="paper-card h-80 animate-pulse rounded-2xl" />
    </div>
  );
}

export default function FundsPage() {
  const pools = createAsync(() => myPools());

  return (
    <div class="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div>
        <h1 class="text-2xl font-black text-charcoal">Funds</h1>
        <p class="mt-1 text-sm text-charcoal/75">
          Shared costs for the weekend, and your share of each.
        </p>
      </div>

      <ErrorBoundary
        fallback={(err) => {
          console.error("[funds] couldn't show pools", err);
          return <LoadFailed />;
        }}
      >
        <Suspense fallback={<FundsSkeleton />}>
          {/* An expired session throws (401) into the boundary; an empty
              response is treated as a failure too. */}
          <Show when={pools()} fallback={<LoadFailed />}>
            {(list) => <PoolList pools={list()} />}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
