# ADR 0011 — Crew chat: messages in Turso, delivered by polling

**Date:** 2026-11-15
**Status:** Proposed

## Context

The organiser wants a group chat inside the app for the ten guests, modelled on iMessage: who sent each message and when should be clear at a glance. The chat should also show who has the app open, using the same ring-avatar circles as the "Who's here" bar on Flights.

The app already has a database (Turso, ADR 0007), signed-in guests from an invite list (ADR 0009), and server functions behind `requireGuest()`. It is a SolidJS app on Vercel's serverless functions.

Options considered for delivery:

- **A hosted chat service** (Stream, Sendbird, TalkJS). Full-featured, but each needs another account and API keys, keeps the messages with a third party, and its UI kits are for React, not SolidJS.
- **A hosted realtime service** (Ably, Pusher, Liveblocks) in front of our own storage. True push, but again an account, keys and a second system to keep in step with the database.
- **WebSockets or server-sent events from our own functions.** Vercel functions are short-lived and per-request; holding a connection open per guest is costly, and Turso has no change feed to push from, so the function would poll the database anyway.
- **Polling our own server functions.** One small request every few seconds while the chat is open, which is cheap for ten people.

## Decision

1. **Messages live in Turso**, in `chat_messages` (id, client_id, guest_id, body, created_at). The id is `AUTOINCREMENT`, so ids only grow and "everything after id N" is how a phone catches up. `created_at` is the server's clock.
2. **The open chat polls every 3 seconds** for messages after the newest one it has, and stops while the page is hidden. Opening the chat loads the latest 50. Scrolling back loads 50 more at a time.
3. **Sends are idempotent.** The browser makes a `client_id` (a UUID) for each message and shows the message straight away as "sending". A retry with the same `client_id` returns the stored message instead of posting it twice. A failed send stays on screen with "Try again" and "Delete".
4. **Messages are plain text.** Up to 1,000 characters. Line breaks are kept, control characters dropped, and blank lines collapsed. They render as text, never HTML. Web addresses and emails become links via `linkifyjs` (only `http`, `https` and `mailto`). One to three emoji on their own show large, as in iMessage.
5. **The sender is always the session's guest.** A guest may send 20 messages a minute, which stops a runaway loop without getting in the way of a conversation.
6. **Unread counts are kept per guest** in `chat_reads` (last_read_id). The chat marks messages read once they're on screen with the page visible. The marker only moves forward and never past the newest message.
7. **Presence: who has the app open.** `guest_presence` holds each guest's last check-in. Every open page (NavBar runs it everywhere except `/sign-in`) calls `pulse()` every 20 seconds while it's on screen. That one request records the check-in and returns who else has checked in within 50 seconds, plus the guest's unread count for the nav badge. Hiding the app calls `leave()`, which deletes the row so the guest shows as offline straight away.
8. **The look follows iMessage.** The guest's own messages are teal bubbles on the right. Everyone else's are on the left, with the sender's name above a run of messages and their photo beside its last bubble. A time header appears for a new day or after a 15-minute pause. "Delivered" shows under the guest's newest message, and tapping a bubble shows its time. Times show in the viewer's own time zone, so the chat renders on the client only.

## Consequences

- No new accounts, keys or services: the chat works wherever the database does, and messages stay in the organiser's database.
- A message reaches others within about 3 seconds while they have the chat open. Phones with the chat closed see the nav badge update within 20 seconds. There are no push notifications; that would need a web push setup (and iOS only allows it for apps added to the home screen).
- Load is small: about one request every 3 seconds per open chat, plus one every 20 seconds per open app. Each check-in writes one row, which is well inside Turso's free tier for ten guests.
- Presence tells the group when someone has the app open. For a private trip among friends that's the point, but it is visible to everyone signed in.
- There's no editing or unsending yet. Deleting a stored message would need a "deleted" marker that polling also picks up, not just new ids.
- If the group or the message rate grows a lot, swap polling for a realtime service in front of the same tables; the message shape and the client's merge-by-id logic stay the same.
