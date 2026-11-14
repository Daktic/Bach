import { createSignal, For, Show } from "solid-js";
import { startCheckout } from "~/lib/api/funds";
import type { PoolChoiceView, PoolView } from "~/lib/types";
import { formatMoney } from "./pool-status";

interface Props {
  pool: Pick<PoolView, "id" | "canPay"> & { choices: PoolChoiceView[] };
}

const players = (n: number) => `${n} ${n === 1 ? "player" : "players"}`;

/**
 * Pick-your-group pools (golf on two courses): choose a group and pay for it
 * in one step. The payment records the group, so a guest who's paid stays in
 * that group (the organiser can switch them). The server re-checks the group
 * and the price.
 */
export function GroupPicker(props: Props) {
  const [selected, setSelected] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const choice = () => props.pool.choices.find((c) => c.id === selected()) ?? null;

  async function pay(e: Event) {
    e.preventDefault();
    const picked = choice();
    if (!picked || pending()) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await startCheckout(props.pool.id, undefined, picked.id);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't open the payment page. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={pay} class="space-y-3">
      <fieldset>
        <legend class="mb-2 text-sm font-bold text-charcoal">Pick your group</legend>
        <div class="space-y-2">
          <For each={props.pool.choices}>
            {(c) => (
              <label
                class={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-3
                        transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                        has-[:focus-visible]:outline-charcoal
                        ${selected() === c.id ? "border-charcoal bg-teal/15" : "border-charcoal/20 bg-white/40"}`}
              >
                <input
                  type="radio"
                  name={`group-${props.pool.id}`}
                  value={c.id}
                  checked={selected() === c.id}
                  onChange={() => {
                    setSelected(c.id);
                    setError(null);
                  }}
                  class="h-5 w-5 shrink-0 accent-charcoal"
                />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-black text-charcoal">{c.title}</span>
                  <Show when={c.description}>
                    <span class="block text-xs text-charcoal/75">{c.description}</span>
                  </Show>
                  <span class="block text-xs font-semibold text-charcoal/75">{players(c.players)} so far</span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block text-base font-black text-charcoal">{formatMoney(c.price)}</span>
                  <span class="block text-[11px] text-charcoal/75">a player</span>
                </span>
              </label>
            )}
          </For>
        </div>
      </fieldset>

      <Show
        when={props.pool.canPay}
        fallback={
          <p class="rounded-xl bg-charcoal/5 px-4 py-3 text-center text-sm text-charcoal/80">
            Card payments open soon.
          </p>
        }
      >
        <button
          type="submit"
          disabled={!choice() || pending()}
          aria-busy={pending()}
          aria-describedby="group-note"
          // Charcoal on orange is 3.1:1, so the label stays large (20px bold).
          class="flex min-h-12 w-full items-center justify-center rounded-xl bg-orange px-4 text-xl
                 font-black text-charcoal transition-transform active:scale-[0.98]
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal
                 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending() ? "Opening checkout…" : choice() ? `Pay ${formatMoney(choice()!.charge)}` : "Pick a group to pay"}
        </button>
        <Show when={error()}>
          <p role="alert" class="text-center text-sm font-semibold text-charcoal">
            {error()}
          </p>
        </Show>
        <p id="group-note" class="text-center text-xs text-charcoal/75">
          <Show when={choice()} fallback="Paying puts you in that group. Secure checkout by Stripe.">
            {(c) => (
              <>
                {c().title}: {formatMoney(c().price)} plus a {formatMoney(c().charge - c().price)} card fee, so the
                pool gets the full amount. Paying puts you in this group.
              </>
            )}
          </Show>
        </p>
      </Show>
    </form>
  );
}

/** Players per group, plus how many still have to pick. `compact` for cards: "3 Cholla 2 Desert Canyon". */
export function GroupCounts(props: { choices: PoolChoiceView[]; undecided: number; compact?: boolean }) {
  return (
    <ul class={props.compact ? "flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-charcoal/75" : "space-y-2 text-sm"}>
      <For each={props.choices}>
        {(c) => (
          <li class={props.compact ? "" : "flex items-baseline justify-between gap-3"}>
            <Show
              when={!props.compact}
              fallback={
                <>
                  <span class="font-black text-charcoal">{c.players}</span> {c.shortTitle}
                </>
              }
            >
              <span class="text-charcoal/80">{c.title}</span>
              <span class="font-black text-charcoal">{players(c.players)}</span>
            </Show>
          </li>
        )}
      </For>
      <Show when={props.undecided > 0}>
        <li class={props.compact ? "" : "flex items-baseline justify-between gap-3"}>
          <Show when={!props.compact} fallback={<><span class="font-black text-charcoal">{props.undecided}</span> still to pick</>}>
            <span class="text-charcoal/80">Still to pick</span>
            <span class="font-black text-charcoal">{props.undecided}</span>
          </Show>
        </li>
      </Show>
    </ul>
  );
}
