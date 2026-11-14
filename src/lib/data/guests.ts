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

export const guests: Guest[] = [
  { id: "gberg",  name: "Garrett", initials: "GB" },
  { id: "chris",  name: "Chris",   initials: "CL" },
  { id: "sarah",  name: "Sarah",   initials: "SM" },
  { id: "jake",   name: "Jake",    initials: "JK" },
  { id: "mike",   name: "Mike",    initials: "MR" },
  { id: "ryan",   name: "Ryan",    initials: "RD" },
  { id: "tom",    name: "Tom",     initials: "TW" },
  { id: "alex",   name: "Alex",    initials: "AC" },
  // Mock example of a guest the organiser knows is driving in (FL-9).
  { id: "jordan", name: "Jordan",  initials: "JN", arrivesBy: "drive" },
  { id: "tyler",  name: "Tyler",   initials: "TP" },
];

export const guestIds: ReadonlySet<string> = new Set(guests.map((g) => g.id));

export function getGuestById(id: string | null | undefined): Guest | null {
  if (!id) return null;
  return guests.find((g) => g.id === id) ?? null;
}
