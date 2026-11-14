import { createSignal, onCleanup, Show } from "solid-js";

// Shares a page of this site: the native share sheet where there is one,
// otherwise copies the link with brief "Link copied" feedback.

interface Props {
  /** Site path to share, e.g. "/activity/fri-dinner". */
  path: string;
  title: string;
  class?: string;
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

/**
 * Copies `text`. Falls back to a hidden textarea where the Clipboard API is
 * missing (plain-http dev on a phone). The textarea goes next to the button
 * because everything outside an open modal dialog is inert.
 */
async function copyText(text: string, near: HTMLElement): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;font-size:16px";
  (near.parentElement ?? document.body).appendChild(area);
  let copied = false;
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    area.remove();
    near.focus({ preventScroll: true });
  }
  return copied;
}

export function ShareButton(props: Props) {
  const [copied, setCopied] = createSignal(false);
  let button!: HTMLButtonElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  async function share() {
    const url = new URL(props.path, window.location.origin).href;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: props.title, url });
        return;
      } catch (err) {
        // Dismissing the share sheet isn't a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    if (await copyText(url, button)) {
      setCopied(true);
      clearTimeout(timer);
      timer = setTimeout(() => setCopied(false), 2000);
    } else {
      // Last resort: let them copy it by hand.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={share}
        class={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors active:scale-[0.99] ${
          copied()
            ? "border-teal bg-teal/10 text-charcoal"
            : "border-charcoal/15 text-charcoal hover:bg-charcoal/5"
        } ${props.class ?? ""}`}
      >
        <Show when={copied()} fallback={<ShareIcon />}>
          <CheckIcon />
        </Show>
        {copied() ? "Link copied" : "Share"}
      </button>
      <span class="sr-only" aria-live="polite">
        {copied() ? "Link copied" : ""}
      </span>
    </>
  );
}
