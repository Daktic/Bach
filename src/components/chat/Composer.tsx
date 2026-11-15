import { createSignal, Show } from "solid-js";
import { MAX_MESSAGE_LENGTH, normalizeMessage } from "~/lib/chat";

// The message box, iMessage-style: a rounded field that grows with the text
// and a round send button inside it. On a computer, Enter sends and
// Shift+Enter starts a new line. On a phone, Return starts a new line and the
// button sends, as in Messages.

/** Grows to about five lines, then scrolls. */
const MAX_HEIGHT_PX = 132;

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" class="h-5 w-5">
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function Composer(props: {
  /** Returns false when nothing was sent (keeps the text). */
  onSend: (text: string) => boolean;
  disabled?: boolean;
}) {
  let input!: HTMLTextAreaElement;
  const [text, setText] = createSignal("");
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const canSend = () => !props.disabled && normalizeMessage(text()) !== null;
  const remaining = () => MAX_MESSAGE_LENGTH - text().length;

  function resize() {
    input.style.height = "auto";
    // scrollHeight leaves out the border; the height (border-box) includes it.
    const border = input.offsetHeight - input.clientHeight;
    input.style.height = `${Math.min(input.scrollHeight + border, MAX_HEIGHT_PX)}px`;
    // A scrollbar only once the text is taller than the box can grow.
    input.style.overflowY = input.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }

  function submit() {
    if (!canSend() || !props.onSend(text())) return;
    setText("");
    input.value = "";
    resize();
    input.focus(); // keeps the phone keyboard up for the next message
  }

  return (
    <form
      class="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div class="relative">
        <label for="chat-input" class="sr-only">
          Message the crew
        </label>
        <textarea
          id="chat-input"
          ref={input}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Message the crew"
          autocomplete="off"
          enterkeyhint={touch ? "enter" : "send"}
          value={text()}
          onInput={(e) => {
            setText(e.currentTarget.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !touch) {
              e.preventDefault();
              submit();
            }
          }}
          class="block max-h-[132px] min-h-11 w-full resize-none overflow-y-hidden rounded-[22px] border border-charcoal/20
                 bg-white/70 py-2.5 pl-4 pr-12 text-base leading-6 text-charcoal placeholder:text-charcoal/50
                 focus:border-charcoal/40 focus:outline-2 focus:outline-offset-2 focus:outline-charcoal"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!canSend()}
          class="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-teal
                 text-charcoal transition-[background-color,color,scale] active:scale-90
                 disabled:bg-charcoal/10 disabled:text-charcoal/40
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
        >
          <ArrowUpIcon />
        </button>
      </div>
      <Show when={remaining() < 100}>
        <p class="px-4 text-right text-[11px] font-semibold text-charcoal/75" aria-live="polite">
          {remaining()} characters left
        </p>
      </Show>
    </form>
  );
}
