import "server-only";
import type { Guest } from "~/lib/types";

// The invited guests, maintained by hand by the organiser.
//
// Sign-in emails are NOT kept here: this repo is public. Each guest's email(s)
// go in the GUEST_EMAILS environment variable as `guestId=email` pairs, e.g.
//   GUEST_EMAILS="gberg=garrett@example.com,gberg=garrett@icloud.example,chris=chris@example.com"
// List a guest more than once to allow several emails (Google + Apple, AUTH-5).
//
// Only server code imports this file. Pages get guest data through the
// server functions in src/lib/api/, which require a signed-in guest.

// Initials (first and last name) show on avatars until a guest uploads a photo.
// `arrivesBy: "drive"` marks someone you know is driving in (FL-9).
export const guests: Guest[] = [
  { id: "gberg",  name: "Garrett", initials: "GB" },
  { id: "andrew", name: "Andrew",  initials: "AM" },
  { id: "avery",  name: "Avery",   initials: "AF" },
  { id: "brett",  name: "Brett",   initials: "BH" },
  { id: "chris",  name: "Chris",   initials: "CW" },
  { id: "jerid",  name: "Jerid",   initials: "JC" },
  { id: "kyle",   name: "Kyle",    initials: "KB" },
  { id: "matt",   name: "Matt",    initials: "MD" },
  { id: "phil",   name: "Phil",    initials: "PD" },
  { id: "scott",  name: "Scott",   initials: "SK" },
];

export const guestIds: ReadonlySet<string> = new Set(guests.map((g) => g.id));

export function getGuestById(id: string | null | undefined): Guest | null {
  if (!id) return null;
  return guests.find((g) => g.id === id) ?? null;
}
