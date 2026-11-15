import { createAsync } from "@solidjs/router";
import { batch, createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show, Suspense } from "solid-js";
import { getChatMessages, markChatRead, sendChatMessage } from "~/lib/api/chat";
import { CHAT_CATCH_UP_LIMIT, newClientId, normalizeMessage, type ChatMessage } from "~/lib/chat";
import { clearChatUnread, refreshPulse, usePulse } from "~/lib/client/pulse";
import { crewQuery, meQuery } from "~/lib/queries";
import type { CrewMemberView } from "~/lib/types";
import type { ChatPerson } from "./ChatAvatar";
import { ChatShell, ChatSkeleton } from "./ChatShell";
import { Composer } from "./Composer";
import { MessageRow } from "./MessageRow";
import { OnlineCount, PresenceStrip } from "./PresenceStrip";
import { layoutThread, type RowLayout, type ThreadMessage } from "./thread";

// The crew chat (ADR 0011). Client-only: times show in the viewer's own time
// zone, and the thread scrolls the page. While the page is visible it asks
// for anything new every few seconds; hidden, it stops until it's back.

const POLL_MS = 3_000;
/** "At the bottom" leaves room for a line or two of slack. */
const NEAR_BOTTOM_PX = 140;
/** Failed polls in a row before saying the chat can't be reached. */
const OFFLINE_AFTER = 3;

const asThread = (m: ChatMessage): ThreadMessage => ({ ...m, key: m.clientId, state: "sent" });
const scroller = () => document.scrollingElement ?? document.documentElement;
const nearBottom = () => {
  const el = scroller();
  return el.scrollTop + window.innerHeight >= el.scrollHeight - NEAR_BOTTOM_PX;
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Scrolls to the newest message once the page has drawn any just added. */
const scrollToBottom = (smooth: boolean) =>
  requestAnimationFrame(() =>
    window.scrollTo({ top: scroller().scrollHeight, behavior: smooth && !reducedMotion() ? "smooth" : "auto" }),
  );
const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export function ChatRoom() {
  return (
    <Suspense
      fallback={
        <ChatShell>
          <ChatSkeleton />
        </ChatShell>
      }
    >
      <Room />
    </Suspense>
  );
}

function Room() {
  const me = createAsync(() => meQuery());
  const crew = createAsync(() => crewQuery().catch((): CrewMemberView[] => []));
  const { online } = usePulse();

  /** Stored messages, oldest first. */
  const [stored, setStored] = createSignal<ThreadMessage[]>([]);
  /** This device's messages still sending or failed, in the order they were sent. */
  const [pending, setPending] = createSignal<ThreadMessage[]>([]);
  const [loaded, setLoaded] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [hasOlder, setHasOlder] = createSignal(false);
  const [loadingOlder, setLoadingOlder] = createSignal(false);
  const [olderError, setOlderError] = createSignal(false);
  /** New messages from others that arrived while scrolled up. */
  const [unseen, setUnseen] = createSignal(0);
  const [offline, setOffline] = createSignal(false);
  const [now, setNow] = createSignal(new Date());
  /**
   * Following the newest message: true at the bottom, false once the guest
   * scrolls up. While true, anything that makes the page taller (new
   * messages, photos loading) keeps the view at the bottom.
   */
  let pinned = true;

  const messages = createMemo(() => [...stored(), ...pending()]);
  const layout = createMemo((): Map<string, RowLayout> => {
    const id = me()?.id;
    return id ? layoutThread(messages(), id, now()) : new Map();
  });
  const people = createMemo(() => {
    const list: ChatPerson[] = (crew() ?? []).map((c) => ({ id: c.id, name: c.name, initials: c.initials, image: c.image }));
    return { list, byId: new Map(list.map((p) => [p.id, p])) };
  });
  const sender = (guestId: string): ChatPerson =>
    people().byId.get(guestId) ?? { id: guestId, name: guestId, initials: guestId.slice(0, 2).toUpperCase() };
  const lastStoredId = () => stored().at(-1)?.id ?? 0;

  // ─── Reading ────────────────────────────────────────────────────────────────

  /** Adds stored messages, keeping existing ones as they are so their rows stay put. */
  function merge(incoming: ChatMessage[]) {
    if (incoming.length === 0) return;
    const byId = new Map(stored().map((m) => [m.id, m]));
    for (const m of incoming) if (!byId.has(m.id)) byId.set(m.id, asThread(m));
    const arrived = new Set(incoming.map((m) => m.clientId));
    batch(() => {
      setStored([...byId.values()].sort((a, b) => a.id - b.id));
      // A message this device sent may come back from a poll before its own reply.
      setPending((list) => list.filter((m) => !arrived.has(m.clientId)));
    });
  }

  let markedUpTo = 0;
  let marking: Promise<unknown> = Promise.resolve();
  /** Tells the server everything shown so far has been read (only while visible). */
  function markRead() {
    const upTo = lastStoredId();
    if (upTo <= markedUpTo || document.visibilityState !== "visible") return;
    markedUpTo = upTo;
    clearChatUnread();
    marking = markChatRead(upTo).catch(() => (markedUpTo = 0));
  }

  async function loadLatest() {
    setLoadError(null);
    try {
      const page = await getChatMessages();
      batch(() => {
        setStored(page.messages.map(asThread));
        setHasOlder(page.hasOlder);
        setLoaded(true);
      });
    } catch (err) {
      setLoadError(errorText(err, "Couldn't load the chat."));
    }
  }
  void loadLatest(); // start now, alongside the guest and crew lookups

  let polling = false;
  let failures = 0;
  async function poll() {
    if (polling || !loaded()) return;
    polling = true;
    try {
      // Catch up in pages if a lot arrived while away.
      for (let round = 0; round < 5; round++) {
        const atBottom = nearBottom();
        const page = await getChatMessages({ after: lastStoredId() });
        const known = new Set(stored().map((m) => m.id));
        const fresh = page.messages.filter((m) => !known.has(m.id));
        merge(page.messages);
        if (fresh.length > 0) {
          if (atBottom) {
            pinned = true;
            markRead();
          } else {
            const fromOthers = fresh.filter((m) => m.guestId !== me()?.id).length;
            setUnseen((n) => n + fromOthers);
          }
        }
        if (page.messages.length < CHAT_CATCH_UP_LIMIT) break;
      }
      failures = 0;
      setOffline(false);
    } catch {
      if (++failures >= OFFLINE_AFTER) setOffline(true);
    } finally {
      polling = false;
    }
  }

  async function loadOlder() {
    const first = stored()[0];
    if (loadingOlder() || !hasOlder() || !first) return;
    setLoadingOlder(true);
    setOlderError(false);
    try {
      const page = await getChatMessages({ before: first.id });
      // Keep the message that was first exactly where it is on screen. It's
      // measured, not worked out from the page height, because its own time
      // header can disappear once older messages join its section.
      const anchor = document.querySelector(`[data-key="${CSS.escape(first.key)}"] [data-bubble]`);
      const before = anchor?.getBoundingClientRect().top;
      const known = new Set(stored().map((m) => m.id));
      batch(() => {
        setStored((list) => [...page.messages.filter((m) => !known.has(m.id)).map(asThread), ...list]);
        setHasOlder(page.hasOlder);
      });
      if (anchor && before !== undefined) window.scrollBy(0, anchor.getBoundingClientRect().top - before);
    } catch {
      setOlderError(true);
    } finally {
      setLoadingOlder(false);
    }
  }

  // ─── Sending ────────────────────────────────────────────────────────────────

  function send(text: string): boolean {
    const guestId = me()?.id;
    const body = normalizeMessage(text);
    if (!guestId || body === null) return false;
    const clientId = newClientId();
    const message: ThreadMessage = {
      id: 0,
      key: clientId,
      clientId,
      guestId,
      body,
      createdAt: new Date().toISOString(),
      state: "sending",
    };
    pinned = true;
    setPending((list) => [...list, message]);
    scrollToBottom(true);
    void deliver(message);
    return true;
  }

  async function deliver(message: ThreadMessage) {
    try {
      const saved = await sendChatMessage({ clientId: message.clientId, body: message.body });
      merge([saved]);
      if (pinned) markRead();
    } catch (err) {
      const error = errorText(err, "Not delivered.");
      setPending((list) => list.map((m) => (m.key === message.key ? { ...m, state: "failed", error } : m)));
    }
  }

  function retry(key: string) {
    const message = pending().find((m) => m.key === key);
    if (!message) return;
    const again: ThreadMessage = { ...message, state: "sending", error: undefined };
    setPending((list) => list.map((m) => (m.key === key ? again : m)));
    void deliver(again);
  }

  function discard(key: string) {
    setPending((list) => list.filter((m) => m.key !== key));
    document.getElementById("chat-input")?.focus();
  }

  // ─── Page life ──────────────────────────────────────────────────────────────

  // Once the first page is on screen: jump to the newest message.
  createEffect(
    on(loaded, (isLoaded) => {
      if (!isLoaded) return;
      pinned = true;
      requestAnimationFrame(() => {
        scrollToBottom(false);
        markRead();
      });
    }),
  );

  onMount(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => void poll(), POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll();
        start();
        if (nearBottom()) markRead();
      } else {
        clearInterval(timer);
      }
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        pinned = nearBottom();
        if (!pinned) return;
        setUnseen(0);
        markRead();
      });
    };
    // Follow the bottom as the page grows: new messages, photos, the header.
    const follow = new ResizeObserver(() => {
      if (pinned) window.scrollTo({ top: scroller().scrollHeight });
    });
    follow.observe(document.documentElement);
    // A reload would otherwise put back the old scroll offset after the chat
    // has already jumped to the newest message.
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const onOnline = () => void poll();
    const clock = setInterval(() => setNow(new Date()), 60_000);

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("online", onOnline);
    onCleanup(() => {
      clearInterval(timer);
      clearInterval(clock);
      cancelAnimationFrame(frame);
      follow.disconnect();
      history.scrollRestoration = restoration;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("online", onOnline);
      // The nav badge picks up from where reading stopped.
      void marking.finally(() => refreshPulse());
    });
  });

  return (
    <ChatShell
      status={<OnlineCount people={people().list} meId={me()?.id} online={online()} />}
      people={<PresenceStrip people={people().list} meId={me()?.id} online={online()} />}
    >
      <Show
        when={loaded()}
        fallback={
          <Show when={loadError()} fallback={<ChatSkeleton />}>
            {(message) => (
              <div class="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
                <p class="text-sm font-bold text-charcoal">{message()}</p>
                <button
                  type="button"
                  onClick={() => void loadLatest()}
                  class="inline-flex min-h-11 items-center rounded-xl bg-charcoal px-6 text-sm font-bold text-cream
                         hover:bg-charcoal/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
                >
                  Try again
                </button>
              </div>
            )}
          </Show>
        }
      >
        <div class="flex flex-1 flex-col justify-end pb-2">
          <Show
            when={hasOlder()}
            fallback={
              <Show when={messages().length > 0}>
                <p class="pb-2 text-center text-[11px] text-charcoal/75">This is the start of the crew chat.</p>
              </Show>
            }
          >
            <div class="flex justify-center pb-2">
              <button
                type="button"
                onClick={() => void loadOlder()}
                disabled={loadingOlder()}
                class="min-h-11 rounded-full px-4 text-xs font-bold text-charcoal/80 underline decoration-teal
                       decoration-2 underline-offset-2 hover:text-charcoal disabled:opacity-60
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
              >
                {loadingOlder() ? "Loading…" : olderError() ? "Couldn't load. Try again" : "Load earlier messages"}
              </button>
            </div>
          </Show>

          <Show
            when={messages().length > 0}
            fallback={
              <p class="py-10 text-center text-sm text-charcoal/75">No messages yet. Say hi to the crew 👋</p>
            }
          >
            <div role="log" aria-label="Messages" aria-relevant="additions">
              <For each={messages()}>
                {(message) => (
                  <MessageRow
                    message={message}
                    layout={layout().get(message.key)}
                    sender={sender(message.guestId)}
                    now={now()}
                    onRetry={retry}
                    onDiscard={discard}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>

        <div class="paper-surface sticky bottom-0 z-20 -mx-3 px-3 pb-3 pt-2">
          <Show when={unseen() > 0}>
            <button
              type="button"
              onClick={() => {
                pinned = true;
                scrollToBottom(true);
                setUnseen(0);
              }}
              class="absolute bottom-full left-1/2 mb-2 inline-flex min-h-9 -translate-x-1/2 items-center gap-1.5
                     rounded-full bg-charcoal px-4 text-xs font-bold text-cream shadow-lg
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
            >
              ↓ {unseen()} new {unseen() === 1 ? "message" : "messages"}
            </button>
          </Show>
          <Show when={offline()}>
            <p role="status" class="pb-1.5 text-center text-[11px] font-semibold text-charcoal/80">
              Can't reach the chat. Trying again…
            </p>
          </Show>
          <Composer onSend={send} disabled={!me()} />
        </div>
      </Show>
    </ChatShell>
  );
}
