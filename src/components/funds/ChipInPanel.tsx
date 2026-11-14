import { createSignal, For, Show } from "solid-js";
import { startCheckout } from "~/lib/api/funds";
import { withCardFees } from "~/lib/card-fees";
import { isValidOpenAmount, OPEN_AMOUNT_MAX, OPEN_AMOUNT_MIN } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { formatMoney } from "./pool-status";

interface Props {
  pool: Pick<PoolView, "id" | "myPaid" | "canPay"> & { open: { presets: number[] } };
}

/**
 * The pay area for an optional, choose-your-own-amount pool (food & drink fund):
 * preset amounts plus "Other". Guests can chip in as often as they like.
 * The card fee is added on top, so the fund receives the chosen amount; the
 * server recomputes the charge from the amount.
 */
export function ChipInPanel(props: Props) {
  const [preset, setPreset] = createSignal<number | null>(
    props.pool.open.presets[1] ?? props.pool.open.presets[0] ?? null,
  );
  const [other, setOther] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const usingOther = () => preset() === null;
  const amount = (): number | null => {
    if (!usingOther()) return preset();
    const text = other().trim().replace(/^\$/, "");
    if (!/^\d+$/.test(text)) return null;
    const n = Number(text);
    return isValidOpenAmount(n) ? n : null;
  };
  const otherInvalid = () => usingOther() && other().trim() !== "" && amount() === null;

  async function chipIn(e: Event) {
    e.preventDefault();
    const value = amount();
    if (value === null || pending()) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await startCheckout(props.pool.id, value);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't open the payment page. Try again.");
      setPending(false);
    }
  }

  const chip = (selected: boolean) =>
    `min-h-11 rounded-xl border-2 px-3 text-base font-black transition-colors
     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal
     ${selected ? "border-charcoal bg-teal text-charcoal" : "border-charcoal/20 bg-white/40 text-charcoal/80 hover:border-charcoal/40"}`;

  return (
    <form onSubmit={chipIn} class="space-y-3">
      <Show when={props.pool.myPaid > 0}>
        <p class="text-sm font-semibold text-charcoal">
          You've chipped in <span class="font-black">{formatMoney(props.pool.myPaid)}</span> so far. Thanks!
        </p>
      </Show>

      <fieldset>
        <legend class="mb-2 text-sm font-bold text-charcoal">How much?</legend>
        <div class="grid grid-cols-4 gap-2">
          <For each={props.pool.open.presets}>
            {(value) => (
              <button
                type="button"
                aria-pressed={preset() === value}
                onClick={() => {
                  setPreset(value);
                  setError(null);
                }}
                class={chip(preset() === value)}
              >
                ${value}
              </button>
            )}
          </For>
        </div>
        <div class="mt-2 flex items-stretch gap-2">
          <button
            type="button"
            aria-pressed={usingOther()}
            onClick={() => {
              setPreset(null);
              setError(null);
              queueMicrotask(() => document.getElementById(`chip-other-${props.pool.id}`)?.focus());
            }}
            class={`${chip(usingOther())} shrink-0`}
          >
            Other
          </button>
          <label class="sr-only" for={`chip-other-${props.pool.id}`}>
            Other amount in dollars
          </label>
          <div class="relative min-w-0 flex-1">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-black text-charcoal/75" aria-hidden="true">
              $
            </span>
            <input
              id={`chip-other-${props.pool.id}`}
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="Any amount"
              value={other()}
              aria-invalid={otherInvalid()}
              aria-describedby="chip-other-hint"
              onFocus={() => setPreset(null)}
              onInput={(e) => {
                setOther(e.currentTarget.value);
                setError(null);
              }}
              class="h-full min-h-11 w-full rounded-xl border-2 border-charcoal/20 bg-white/60 pl-7 pr-3 text-base
                     font-bold text-charcoal outline-none placeholder:font-normal placeholder:text-charcoal/50
                     focus:border-charcoal aria-[invalid=true]:border-orange"
            />
          </div>
        </div>
        <p id="chip-other-hint" class={`mt-1.5 text-xs ${otherInvalid() ? "font-semibold text-charcoal" : "text-charcoal/75"}`}>
          Whole dollars, ${OPEN_AMOUNT_MIN} to ${OPEN_AMOUNT_MAX}.
        </p>
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
          disabled={amount() === null || pending()}
          aria-busy={pending()}
          aria-describedby="chip-note"
          // Charcoal on orange is 3.1:1, so the label stays large (20px bold).
          class="flex min-h-12 w-full items-center justify-center rounded-xl bg-orange px-4 text-xl
                 font-black text-charcoal transition-transform active:scale-[0.98]
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal
                 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending() ? "Opening checkout…" : amount() !== null ? `Chip in $${amount()}` : "Chip in"}
        </button>
        <Show when={error()}>
          <p role="alert" class="text-center text-sm font-semibold text-charcoal">
            {error()}
          </p>
        </Show>
        <p id="chip-note" class="text-center text-xs text-charcoal/75">
          <Show when={amount()} fallback="Secure checkout by Stripe.">
            {(value) => (
              <>
                You'll pay {formatMoney(withCardFees(value()))}, which includes the card fee, so the fund gets
                the full ${value()}. Secure checkout by Stripe.
              </>
            )}
          </Show>
        </p>
      </Show>
    </form>
  );
}
