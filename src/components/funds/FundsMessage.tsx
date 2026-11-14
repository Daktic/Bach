import { children, type JSX, Show } from "solid-js";

/**
 * h1 when the message is the page's main content (an unknown pool, or one
 * that failed to load), so the page still has a heading for AppShell to move
 * focus to. h2 under a page's own h1, as on /funds.
 */
export type MessageHeadingLevel = "h1" | "h2";

interface Props {
  title: string;
  body: string;
  /** Defaults to h2. */
  headingLevel?: MessageHeadingLevel;
  /** Optional link or button under the message. */
  children?: JSX.Element;
}

/** Empty, not-found and error states for the funds pages. */
export function FundsMessage(props: Props) {
  // Resolve the action once. Reading props.children twice creates the link
  // twice, and on the server Show reads its `when` twice: the copy in the
  // HTML then carries a different hydration key from the one the browser
  // creates, and hydration fails (/funds/nope fell into its error state).
  const action = children(() => props.children);
  return (
    <div class="paper-card rounded-xl px-5 py-8 text-center">
      {props.headingLevel === "h1" ? (
        <h1 class="text-base font-black text-charcoal">{props.title}</h1>
      ) : (
        <h2 class="text-base font-black text-charcoal">{props.title}</h2>
      )}
      <p class="mt-1.5 text-sm leading-relaxed text-charcoal/75">{props.body}</p>
      <Show when={action()}>
        <div class="mt-5 flex justify-center">{action()}</div>
      </Show>
    </div>
  );
}

export const messageActionClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-charcoal px-5 " +
  "text-sm font-semibold text-cream transition-transform active:scale-[0.98]";

/**
 * The data didn't arrive: a network error, or the session ended (the server
 * answers 401). A full reload retries, and sends a signed-out guest to /sign-in.
 */
export function LoadFailed(props: { title?: string; headingLevel?: MessageHeadingLevel }) {
  return (
    <FundsMessage
      title={props.title ?? "Couldn't load your funds"}
      body="Check your connection and try again."
      headingLevel={props.headingLevel}
    >
      <button type="button" onClick={() => window.location.reload()} class={messageActionClass}>
        Try again
      </button>
    </FundsMessage>
  );
}
