import { createMemo, createSignal, For, Show } from "solid-js";
import { ChatAvatar, type ChatPerson } from "./ChatAvatar";
import { isBigEmoji, linkSegments, spokenTime, timeLabel, type RowLayout, type ThreadMessage } from "./thread";

// One message in the thread, iMessage-style: the guest's own on the right in
// teal, everyone else's on the left with their name above a run and their
// photo beside its last bubble. Each message carries who sent it and when in
// text for screen readers; the visible headers and names are decorative.

/** The curl at the bottom of the last bubble in a run. Sits under the bubble, in its colour. */
function Tail(props: { mine: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      class={`pointer-events-none absolute bottom-0 z-0 h-5 w-5 ${
        props.mine ? "-right-1.5 fill-bubble-me" : "-left-1.5 -scale-x-100 fill-bubble-them"
      }`}
    >
      {/* Fills the bubble's rounded corner, then sweeps out to the tip. */}
      <path d="M0 0H14V2Q14 17 20 20H0Z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="mr-1 inline h-3.5 w-3.5 align-[-3px] text-orange">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

const statusText = "text-[11px] font-semibold text-charcoal/75";

export function MessageRow(props: {
  message: ThreadMessage;
  layout: RowLayout | undefined;
  sender: ChatPerson;
  now: Date;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
}) {
  const m = () => props.message;
  const mine = () => props.layout?.mine ?? false;
  const big = createMemo(() => isBigEmoji(m().body));
  const segments = createMemo(() => linkSegments(m().body));
  const when = () => spokenTime(m().createdAt, props.now);
  // Tapping a bubble shows its time, as swiping does in iMessage.
  const [timeShown, setTimeShown] = createSignal(false);

  const toggleTime = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    setTimeShown((shown) => !shown);
  };

  return (
    <div data-key={m().key} class={props.layout?.last ? "pb-2" : "pb-0.5"}>
      <Show when={props.layout?.separator}>
        {(sep) => (
          <p aria-hidden="true" class="pb-2 pt-4 text-center text-[11px] text-charcoal/75">
            <span class="font-bold">{sep().day}</span> {sep().time}
          </p>
        )}
      </Show>

      <Show when={!mine() && props.layout?.first}>
        <p aria-hidden="true" class="mb-0.5 ml-12 text-[11px] font-semibold text-charcoal/75">
          {props.sender.name}
        </p>
      </Show>

      <div class={`flex items-end gap-2 ${mine() ? "justify-end pl-12" : "pr-12"}`}>
        <Show when={!mine()}>
          <div class="w-7 shrink-0">
            <Show when={props.layout?.last}>
              <ChatAvatar person={props.sender} />
            </Show>
          </div>
        </Show>

        <div
          data-bubble
          class={`relative min-w-0 ${m().state === "sending" ? "opacity-60" : ""} ${big() ? "" : "max-w-full"}`}
          title={when()}
          onClick={toggleTime}
        >
          <p
            class={
              big()
                ? "text-[40px] leading-tight"
                : `relative z-[1] whitespace-pre-wrap rounded-[18px] px-3 py-[7px] text-[15px] leading-[1.35]
                   text-charcoal [overflow-wrap:anywhere] ${mine() ? "bg-bubble-me" : "bg-bubble-them"}`
            }
          >
            <span class="sr-only">
              {mine() ? "You" : props.sender.name}, {when()}:{" "}
            </span>
            <For each={segments()}>
              {(seg) =>
                seg.href ? (
                  <a
                    href={seg.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="font-semibold underline decoration-1 underline-offset-2"
                  >
                    {seg.text}
                  </a>
                ) : (
                  seg.text
                )
              }
            </For>
          </p>
          <Show when={props.layout?.last && !big()}>
            <Tail mine={mine()} />
          </Show>
        </div>
      </div>

      <div class={mine() ? "text-right" : "ml-9"}>
        <Show when={m().state === "failed"}>
          <div class={`mt-1 flex flex-col ${mine() ? "items-end" : "items-start"}`}>
            <p role="alert" class={`max-w-[85%] ${mine() ? "text-right" : ""} ${statusText}`}>
              <AlertIcon />
              {m().error ?? "Not delivered."}
            </p>
            <div class="-my-2 flex gap-1">
              <button
                type="button"
                onClick={() => props.onRetry(m().key)}
                class="min-h-11 px-1.5 text-[11px] font-bold text-charcoal underline decoration-teal decoration-2 underline-offset-2"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => props.onDiscard(m().key)}
                class="min-h-11 px-1.5 text-[11px] font-semibold text-charcoal/75 underline underline-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </Show>
        <Show when={timeShown()}>
          <p class={`mt-0.5 px-1 ${statusText}`}>
            <time datetime={m().createdAt}>{timeLabel(m().createdAt, props.now).time}</time>
          </p>
        </Show>
        <Show when={props.layout?.delivered && !timeShown()}>
          <p class={`mt-0.5 px-1 ${statusText}`}>Delivered</p>
        </Show>
      </div>
    </div>
  );
}
