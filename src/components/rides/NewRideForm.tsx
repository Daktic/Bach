import { createSignal, For, Show } from "solid-js";
import { TRIP_DAYS } from "~/lib/config";
import { ridePlaces } from "~/lib/ride-places";
import { primaryButton, rideDay, secondaryButton } from "./ui";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-xl border border-charcoal/20 bg-cream px-3 text-base text-charcoal " +
  "focus:outline-2 focus:outline-charcoal";
const labelClass = "block text-xs font-semibold text-charcoal/75";

/** Adds a ride: from, to, when, and an optional note. */
export function NewRideForm(props: {
  busy: boolean;
  onCreate: (ride: { from: string; to: string; day: string; time: string; note: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = createSignal(false);
  const [from, setFrom] = createSignal("phx");
  const [to, setTo] = createSignal("house");
  const [day, setDay] = createSignal<string>(TRIP_DAYS[0]);
  const [time, setTime] = createSignal("15:00");
  const [note, setNote] = createSignal("");

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const ok = await props.onCreate({ from: from(), to: to(), day: day(), time: time(), note: note() });
    if (ok) {
      setOpen(false);
      setNote("");
    }
  }

  return (
    <Show
      when={open()}
      fallback={
        <button type="button" class={`${primaryButton} w-full`} onClick={() => setOpen(true)}>
          Add a ride
        </button>
      }
    >
      <form onSubmit={submit} class="paper-card space-y-3 rounded-2xl p-4">
        <h2 class="text-base font-black text-charcoal">New ride</h2>
        <div class="grid grid-cols-2 gap-3">
          <label class={labelClass}>
            From
            <select class={fieldClass} value={from()} onChange={(e) => setFrom(e.currentTarget.value)}>
              <For each={ridePlaces}>{(p) => <option value={p.id}>{p.name}</option>}</For>
            </select>
          </label>
          <label class={labelClass}>
            To
            <select class={fieldClass} value={to()} onChange={(e) => setTo(e.currentTarget.value)}>
              <For each={ridePlaces}>{(p) => <option value={p.id}>{p.name}</option>}</For>
            </select>
          </label>
          <label class={labelClass}>
            Day
            <select class={fieldClass} value={day()} onChange={(e) => setDay(e.currentTarget.value)}>
              <For each={TRIP_DAYS}>{(d) => <option value={d}>{rideDay(d)}</option>}</For>
            </select>
          </label>
          <label class={labelClass}>
            Time (Arizona)
            <input type="time" required class={fieldClass} value={time()} onInput={(e) => setTime(e.currentTarget.value)} />
          </label>
        </div>
        <label class={labelClass}>
          Note (optional)
          <input
            class={fieldClass}
            maxlength={120}
            placeholder="e.g. Terminal 4, door 7"
            value={note()}
            onInput={(e) => setNote(e.currentTarget.value)}
          />
        </label>
        <Show when={from() === to()}>
          <p class="text-xs font-semibold text-charcoal">Pick two different places.</p>
        </Show>
        <div class="flex gap-2">
          <button type="submit" class={`${primaryButton} flex-1`} disabled={props.busy || from() === to()}>
            Add ride
          </button>
          <button type="button" class={secondaryButton} onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </Show>
  );
}
