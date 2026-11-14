import { A, createAsync, query, revalidate, type RouteDefinition, useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { createSignal, ErrorBoundary, For, Match, onMount, type ParentProps, Show, Suspense, Switch } from "solid-js";
import { Dot } from "~/components/funds/Dot";
import { DueBadge } from "~/components/funds/DueBadge";
import { FundsMessage, LoadFailed, messageActionClass } from "~/components/funds/FundsMessage";
import { ProgressBar } from "~/components/funds/FundingProgress";
import { PayPanel } from "~/components/funds/PayPanel";
import { PoolHero } from "~/components/funds/PoolHero";
import { amountToGo, formatMoney, fundedPercent, shareState } from "~/components/funds/pool-status";
import { type CheckoutReturn, confirmCheckout, getMyPool } from "~/lib/api/funds";
import { createNow } from "~/lib/client/clock";
import { balanceDue, isFullyFunded, isOverdue } from "~/lib/funds";
import type { PoolView } from "~/lib/types";

// Wrapped in query() so the route can preload it, a redirect from the server
// is followed, and the return from Stripe can revalidate the "myPool" key.
const myPool = query((id: string) => getMyPool(id), "myPool");

export const route = {
  preload: ({ params }) => myPool(params.id ?? ""),
} satisfies RouteDefinition;

// ─── Small pieces ─────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <A
      href="/funds"
      class="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2
             text-sm font-semibold text-charcoal/75 transition-colors hover:text-charcoal"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4" aria-hidden="true">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
      </svg>
      All funds
    </A>
  );
}

function SectionLabel(props: ParentProps) {
  return (
    <h2 class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">
      {props.children}
    </h2>
  );
}

/** `dot` colours a marker before the value; the value itself stays charcoal. */
function SummaryRow(props: { label: string; value: string; dot?: string }) {
  return (
    <div class="flex items-baseline justify-between gap-4 text-sm">
      <dt class="font-medium text-charcoal/75">{props.label}</dt>
      <dd class="font-bold tabular-nums text-charcoal">
        <Show when={props.dot}>{(dot) => <Dot class={dot()} />}</Show>
        {props.value}
      </dd>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 text-charcoal/30" aria-hidden="true">
      <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

// ─── Pool detail ──────────────────────────────────────────────────────────────

function PoolDetail(props: { pool: PoolView }) {
  // Time-based state (FN-8 overdue) starts after mount: SSR and hydration
  // render the same markup, and the dev ?mockDate param is honoured. It keeps
  // ticking, so a page left open past the due date turns overdue.
  const now = createNow();

  const state = () => shareState(props.pool);
  const balance = () => balanceDue(props.pool);
  const overdue = () => {
    const n = now();
    return n !== null && isOverdue(props.pool, n);
  };

  return (
    <article class="space-y-5">
      <div class="paper-card overflow-hidden rounded-2xl">
        <PoolHero pool={props.pool} paid={state() === "paid"} class="h-44" />
      </div>

      {/* What the pool covers. A <div>, not a <header>: NavBar's is the
          page's only one. */}
      <div>
        <h1 class="break-words text-2xl font-black leading-tight text-charcoal">{props.pool.title}</h1>
        <p class="mt-2 break-words text-sm leading-relaxed text-charcoal/80">{props.pool.description}</p>
      </div>

      {/* TL-5: back to the timeline activities this pool pays for */}
      <Show when={props.pool.activities.length > 0}>
        <section class="space-y-2">
          <SectionLabel>Pays for</SectionLabel>
          <ul class="space-y-2">
            <For each={props.pool.activities}>
              {(activity) => (
                <li>
                  <A
                    href={`/activity/${encodeURIComponent(activity.id)}`}
                    class="paper-card flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5
                           text-sm font-semibold text-charcoal
                           transition-all hover:brightness-[1.02] active:scale-[0.99]"
                  >
                    <span class="min-w-0 flex-1 break-words">{activity.title}</span>
                    <ChevronIcon />
                  </A>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>

      {/* The viewer's own share and the pay area. Never anyone else's. */}
      <section class="paper-card rounded-xl px-4 py-4">
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <SectionLabel>What you owe</SectionLabel>
          <Show when={props.pool.dueDate}>
            {(due) => (
              <DueBadge
                dueDate={due()}
                overdue={overdue()}
                muted={state() === "paid" || state() === "none"}
                long
              />
            )}
          </Show>
        </div>

        <Show when={state() !== "none"}>
          <dl class="mt-3 space-y-2">
            <SummaryRow label="Your share" value={formatMoney(props.pool.myShare)} />
            <SummaryRow label="You've paid" value={formatMoney(props.pool.myPaid)} />
            <SummaryRow
              label="Balance due"
              value={formatMoney(balance())}
              dot={balance() > 0 ? "bg-orange" : "bg-teal"}
            />
          </dl>
        </Show>

        <div class={state() === "none" ? "mt-3" : "mt-4 border-t border-charcoal/8 pt-4"}>
          <PayPanel pool={props.pool} />
        </div>
      </section>

      {/* Pool totals */}
      <section class="paper-card space-y-3 rounded-xl px-4 py-4">
        <SectionLabel>The pool</SectionLabel>
        <dl class="space-y-2">
          <SummaryRow label="Goal" value={formatMoney(props.pool.targetAmount)} />
          <SummaryRow label="Raised so far" value={formatMoney(props.pool.raisedAmount)} />
        </dl>
        <ProgressBar pool={props.pool} />
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 text-xs font-semibold">
          <span class="text-charcoal/75">{Math.floor(fundedPercent(props.pool))}% funded</span>
          {/* The dot matches the bar's fill. */}
          <Show
            when={isFullyFunded(props.pool)}
            fallback={
              <span class="font-bold text-charcoal">
                <Dot class="bg-orange" />
                {formatMoney(amountToGo(props.pool))} to go
              </span>
            }
          >
            <span class="font-bold text-charcoal">
              <Dot class="bg-teal" />
              Fully funded
            </span>
          </Show>
        </div>
      </section>
    </article>
  );
}

function PoolNotFound() {
  return (
    <>
      <HttpStatusCode code={404} />
      <FundsMessage
        headingLevel="h1"
        title="We couldn't find that pool"
        body="It may have been renamed or removed. Everything you're part of is on the funds page."
      >
        <A href="/funds" class={messageActionClass}>
          See all funds
        </A>
      </FundsMessage>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div class="space-y-5">
      <span class="sr-only">Loading pool…</span>
      <div aria-hidden="true" class="paper-card h-44 animate-pulse rounded-2xl" />
      <div aria-hidden="true" class="h-7 w-2/3 animate-pulse rounded-lg bg-charcoal/10" />
      <div aria-hidden="true" class="paper-card h-48 animate-pulse rounded-xl" />
    </div>
  );
}

// ─── Back from Stripe Checkout (FN-6) ─────────────────────────────────────────

type Notice = CheckoutReturn | "cancelled";

const NOTICE_TEXT: Record<Notice, string> = {
  paid: "Payment received. Thanks!",
  processing: "Your payment is processing. It'll show here once it clears.",
  unknown: "Checking your payment… If it doesn't show up in a minute, refresh the page.",
  cancelled: "Payment cancelled. You haven't been charged.",
};

/**
 * Stripe sends the guest back with ?checkout=success&session_id=… (or
 * ?checkout=cancelled). Confirm the session so the pool shows as paid right
 * away, then drop the query string so a reload doesn't repeat it.
 */
function CheckoutNotice() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const [notice, setNotice] = createSignal<Notice | null>(null);

  onMount(async () => {
    const checkout = search.checkout;
    if (checkout !== "success" && checkout !== "cancelled") return;
    const sessionId = typeof search.session_id === "string" ? search.session_id : "";
    navigate(`/funds/${encodeURIComponent(params.id ?? "")}`, { replace: true, scroll: false });
    if (checkout === "cancelled") {
      setNotice("cancelled");
      return;
    }
    setNotice("unknown");
    setNotice(await confirmCheckout(sessionId));
    await revalidate([myPool.key, "myPools"]);
  });

  return (
    <Show when={notice()}>
      {(n) => (
        <p
          role="status"
          class={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-charcoal ${
            n() === "paid" ? "border-teal bg-teal/15" : "border-charcoal/15 bg-charcoal/5"
          }`}
        >
          <Show when={n() === "paid"}>
            <Dot class="bg-teal" />
          </Show>
          {NOTICE_TEXT[n()]}
        </p>
      )}
    </Show>
  );
}

export default function FundDetailPage() {
  const params = useParams();
  // deferStream: wait for the pool before streaming, so an unknown id can
  // still answer with a 404 status.
  const pool = createAsync(() => myPool(params.id ?? ""), { deferStream: true });

  return (
    <div class="mx-auto max-w-lg space-y-3 px-4 pb-10 pt-2">
      <BackLink />
      <CheckoutNotice />

      <ErrorBoundary
        fallback={(err) => {
          console.error("[funds] couldn't show pool", err);
          return <LoadFailed title="Couldn't load this pool" headingLevel="h1" />;
        }}
      >
        <Suspense fallback={<DetailSkeleton />}>
          {/* null: no such pool. An expired session throws (401) into the
              boundary; any other empty response is a failure too. Each
              outcome brings the page's <h1>. */}
          <Switch fallback={<LoadFailed title="Couldn't load this pool" headingLevel="h1" />}>
            <Match when={pool()}>{(p) => <PoolDetail pool={p()} />}</Match>
            <Match when={pool() === null}>
              <PoolNotFound />
            </Match>
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
