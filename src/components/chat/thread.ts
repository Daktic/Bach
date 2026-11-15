import { find } from "linkifyjs";
import type { ChatMessage } from "~/lib/chat";

// Pure logic behind the chat thread: how messages group into runs, where the
// time headers go, and how a message's text is shown. No browser APIs, so it
// runs with any `now` and time zone and is unit tested.

export type SendState = "sent" | "sending" | "failed";

/** A message as the thread shows it: stored ones, plus this device's unsent ones. */
export interface ThreadMessage extends ChatMessage {
  /** Stays the same from "sending" to "sent" (it's the client id). */
  key: string;
  state: SendState;
  /** Why a send failed, in words the guest can act on. */
  error?: string;
}

export interface RowLayout {
  mine: boolean;
  /** A time header above this message (a new day, or a long pause). */
  separator: TimeLabel | null;
  /** Starts a run of messages from one sender: their name goes above it. */
  first: boolean;
  /** Ends the run: it gets the bubble's tail and the sender's photo. */
  last: boolean;
  /** "Delivered": the guest's own message, stored, and the newest in the thread. */
  delivered: boolean;
}

export interface TimeLabel {
  /** "Today", "Yesterday", "Tuesday" or "Sat, Nov 14". */
  day: string;
  /** "3:42 PM". */
  time: string;
}

/** A pause this long starts a new time header, like iMessage. */
export const SEPARATOR_GAP_MS = 15 * 60_000;
/** Messages from one sender this close together form one run. */
export const RUN_GAP_MS = 5 * 60_000;

const ms = (iso: string) => Date.parse(iso);

/** "2027-04-08" for an instant, in `timeZone` (the viewer's own when omitted). */
export function dayKey(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Whole days from one "YYYY-MM-DD" to another. */
function daysBetween(from: string, to: string): number {
  const utc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** When a message was sent, in iMessage's words, in the viewer's time zone. */
export function timeLabel(iso: string, now: Date, timeZone?: string): TimeLabel {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
  const ago = daysBetween(dayKey(date, timeZone), dayKey(now, timeZone));
  let day: string;
  if (ago <= 0) day = "Today";
  else if (ago === 1) day = "Yesterday";
  else if (ago < 7) day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date);
  else {
    const sameYear = dayKey(date, timeZone).slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
    day = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    }).format(date);
  }
  return { day, time };
}

/** "Today at 3:42 PM", for screen readers and tooltips. */
export function spokenTime(iso: string, now: Date, timeZone?: string): string {
  const { day, time } = timeLabel(iso, now, timeZone);
  return `${day} at ${time}`;
}

/**
 * Where each message's header, name, tail and "Delivered" go, keyed by
 * message key. Messages must be in thread order (oldest first).
 */
export function layoutThread(
  messages: readonly ThreadMessage[],
  meId: string,
  now: Date,
  timeZone?: string,
): Map<string, RowLayout> {
  const layout = new Map<string, RowLayout>();
  // A header starts before message i when it's the first, the day changed, or
  // there was a long pause.
  const startsSection = (i: number) => {
    if (i === 0) return true;
    const gap = ms(messages[i].createdAt) - ms(messages[i - 1].createdAt);
    return (
      gap >= SEPARATOR_GAP_MS ||
      dayKey(new Date(messages[i].createdAt), timeZone) !== dayKey(new Date(messages[i - 1].createdAt), timeZone)
    );
  };
  // Message i continues the run before it: same sender, same section, close in time.
  const joinsPrevious = (i: number) =>
    i > 0 &&
    !startsSection(i) &&
    messages[i].guestId === messages[i - 1].guestId &&
    ms(messages[i].createdAt) - ms(messages[i - 1].createdAt) < RUN_GAP_MS;

  messages.forEach((m, i) => {
    const mine = m.guestId === meId;
    layout.set(m.key, {
      mine,
      separator: startsSection(i) ? timeLabel(m.createdAt, now, timeZone) : null,
      first: !joinsPrevious(i),
      last: i === messages.length - 1 || !joinsPrevious(i + 1),
      delivered: mine && m.state === "sent" && i === messages.length - 1,
    });
  });
  return layout;
}

// ─── Message text ─────────────────────────────────────────────────────────────

// Emoji, skin tones, flags, keycaps and the joiners that build family and
// profession emoji. Digits and # only count as part of a keycap.
const EMOJI_ONLY =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[#*0-9]️?⃣|‍|️)+$/u;

function graphemeCount(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].length;
  }
  return Array.from(text).length;
}

/** True for a message of one to three emoji and nothing else: shown big, without a bubble. */
export function isBigEmoji(body: string): boolean {
  const compact = body.replace(/\s+/g, "");
  return compact.length > 0 && EMOJI_ONLY.test(compact) && graphemeCount(compact) <= 3;
}

export interface TextSegment {
  text: string;
  /** Set for a link: an http(s) or mailto URL. */
  href?: string;
}

/**
 * The text split into plain runs and links (web addresses and emails), so
 * links render as <a> elements without ever treating the text as HTML.
 */
export function linkSegments(body: string): TextSegment[] {
  const links = find(body, { defaultProtocol: "https" }).filter(
    (link) => link.isLink && /^(https?:\/\/|mailto:)/i.test(link.href),
  );
  const segments: TextSegment[] = [];
  let at = 0;
  for (const link of links) {
    if (link.start > at) segments.push({ text: body.slice(at, link.start) });
    segments.push({ text: body.slice(link.start, link.end), href: link.href });
    at = link.end;
  }
  if (at < body.length) segments.push({ text: body.slice(at) });
  return segments;
}
