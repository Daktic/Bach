// The crew chat (ADR 0011): what a message is, and the rules both the browser
// (before sending) and the server (before storing) apply to it.

export interface ChatMessage {
  /** Server-assigned, only ever grows. Newer messages have bigger ids. */
  id: number;
  /** Made by the sender's browser; makes retried sends safe. */
  clientId: string;
  guestId: string;
  body: string;
  /** Server clock, ISO 8601 UTC. */
  createdAt: string;
}

export interface ChatPage {
  messages: ChatMessage[];
  /** For a page of older messages: whether there are more before it. */
  hasOlder: boolean;
}

export const MAX_MESSAGE_LENGTH = 1000;
/** Messages per page when opening the chat or scrolling back. */
export const CHAT_PAGE_SIZE = 50;
/** Most new messages returned by one catch-up request. */
export const CHAT_CATCH_UP_LIMIT = 200;

// C0 controls and DEL, except tab (\u0009) and newline (\u000A).
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

/**
 * The text as it will be stored: line endings unified, control characters
 * dropped, at most one blank line in a row, trimmed. Null when there's
 * nothing left to send or it's too long.
 */
export function normalizeMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) return null;
  return text;
}

/** A browser-made id: a UUID, or anything similar in shape. */
export function isValidClientId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value);
}

/** A new client id (crypto.randomUUID needs HTTPS or localhost; fall back otherwise). */
export function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}
