import { createSignal, For, Show } from "solid-js";
import { formatCents, netBalances, rideDebts, type RideView } from "~/lib/rides";
import { listNames, rideDay, rideTime, secondaryButton, type CrewLookup } from "./ui";

/**
 * Who owes whom for rides, netted per pair, and a summary to paste into
 * Splitwise (Bach doesn't move money for rides; ADR 0012).
 */
export function RideTab(props: { rides: RideView[]; me: string; crew: CrewLookup }) {
  const balances = () => netBalances(rideDebts(props.rides));
  const mine = () => balances().filter((b) => b.from === props.me || b.to === props.me);
  const others = () => balances().filter((b) => b.from !== props.me && b.to !== props.me);
  const bookedWithFare = () =>
    props.rides.flatMap((r) => r.cars.filter((c) => c.booking?.fareCents != null).map((c) => ({ ride: r, car: c })));
  const [copied, setCopied] = createSignal<"yes" | "failed" | null>(null);

  function splitwiseText(): string {
    const lines = bookedWithFare().map(({ ride, car }) => {
      const b = car.booking!;
      const where = `to ${ride.destination.name}`;
      const others = b.riders.filter((r) => r !== b.bookerId).map((r) => props.crew(r).name);
      return (
        `${b.provider === "uber" ? "Uber" : "Lyft"} ${where}${ride.departAt ? ` (${rideDay(ride.departAt)} ${rideTime(ride.departAt)})` : ""}: ` +
        `${formatCents(b.fareCents!)} paid by ${props.crew(b.bookerId).name}, split equally with ${listNames(others)}`
      );
    });
    const owing = balances().map((x) => `${props.crew(x.from).name} owes ${props.crew(x.to).name} ${formatCents(x.cents)}`);
    return [...lines, "", "Still owed:", ...(owing.length ? owing : ["Nothing, everyone's square."])].join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(splitwiseText());
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 3000);
  }

  const line = (b: { from: string; to: string; cents: number }) =>
    b.from === props.me
      ? `You owe ${props.crew(b.to).name}`
      : b.to === props.me
        ? `${props.crew(b.from).name} owes you`
        : `${props.crew(b.from).name} owes ${props.crew(b.to).name}`;

  return (
    <Show when={bookedWithFare().length > 0}>
      <section aria-labelledby="ride-tab" class="paper-card rounded-2xl p-4">
        <h2 id="ride-tab" class="text-base font-black text-charcoal">Ride tab</h2>
        <Show
          when={balances().length > 0}
          fallback={<p class="mt-1 text-sm text-charcoal/75">Everyone's paid back. Nice.</p>}
        >
          <ul class="mt-2 divide-y divide-charcoal/10">
            <For each={[...mine(), ...others()]}>
              {(b) => (
                <li class="flex min-h-10 items-center justify-between gap-3 text-sm text-charcoal">
                  <span class={b.from === props.me || b.to === props.me ? "font-black" : ""}>{line(b)}</span>
                  <span class="font-black tabular-nums">{formatCents(b.cents)}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" class={secondaryButton} onClick={copy}>
            Copy for Splitwise
          </button>
          <a href="https://secure.splitwise.com/" target="_blank" rel="noopener noreferrer" class={secondaryButton}>
            Open Splitwise
          </a>
          <span role="status" class="text-xs font-semibold text-charcoal/75">
            {copied() === "yes" ? "Copied" : copied() === "failed" ? "Couldn't copy" : ""}
          </span>
        </div>
        <p class="mt-2 text-xs text-charcoal/75">
          Settled up? Tick "Paid back" on the car so it drops off here.
        </p>
      </section>
    </Show>
  );
}
