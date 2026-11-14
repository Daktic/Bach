// Pure parsing for the GUEST_EMAILS allow-list (AUTH-3, AUTH-5).
// Kept free of env/server imports so it can be unit tested.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface AllowList {
  /** normalized email → guest id */
  emailToGuest: ReadonlyMap<string, string>;
  /** Human-readable problems, without email addresses (safe to log). */
  problems: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only echo an unknown guest id that looks like one. A swapped pair
// ("someone@example.com=gberg") would otherwise put the email in the logs.
const SAFE_GUEST_ID_RE = /^[a-z0-9_-]+$/i;

/**
 * Parses `guestId=email` pairs separated by commas, semicolons or newlines.
 * Entries with an unknown guest id or a malformed email are skipped. An email
 * listed against two different guests is dropped entirely: it's ambiguous, so
 * it fails closed.
 */
export function parseGuestEmails(
  raw: string | undefined | null,
  knownGuestIds: ReadonlySet<string>,
): AllowList {
  const problems: string[] = [];
  const pairs = new Map<string, string>();
  const conflicted = new Set<string>();

  const entries = (raw ?? "")
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter(Boolean);

  entries.forEach((entry, i) => {
    const n = i + 1;
    const sep = entry.indexOf("=");
    if (sep <= 0) {
      problems.push(`entry ${n}: expected guestId=email`);
      return;
    }
    const guestId = entry.slice(0, sep).trim();
    const email = normalizeEmail(entry.slice(sep + 1));
    if (!knownGuestIds.has(guestId)) {
      problems.push(
        SAFE_GUEST_ID_RE.test(guestId)
          ? `entry ${n}: unknown guest id "${guestId}"`
          : `entry ${n}: unknown guest id (expected guestId=email)`,
      );
      return;
    }
    if (!EMAIL_RE.test(email)) {
      problems.push(`entry ${n}: not a valid email`);
      return;
    }
    const existing = pairs.get(email);
    if (existing && existing !== guestId) {
      conflicted.add(email);
      problems.push(`entry ${n}: email already listed for another guest; ignoring it for both`);
      return;
    }
    pairs.set(email, guestId);
  });

  for (const email of conflicted) pairs.delete(email);
  return { emailToGuest: pairs, problems };
}

/** Guest id for an email, or null when the email isn't invited. */
export function lookupGuestId(list: AllowList, email: string | null | undefined): string | null {
  if (!email) return null;
  return list.emailToGuest.get(normalizeEmail(email)) ?? null;
}
