"use server";

import { getDb } from "~/lib/server/db";
import { requireGuest } from "~/lib/server/session";
import { getProfile, saveProfile, type GuestProfile } from "~/lib/server/store";

// The signed-in guest's display name and photo (ME-2), shared with the crew.

export async function getMyProfile(): Promise<GuestProfile> {
  const { guest } = await requireGuest();
  return getProfile(getDb(), guest.id);
}

export async function saveMyProfile(profile: GuestProfile): Promise<GuestProfile> {
  const { guest } = await requireGuest();
  if (!profile || typeof profile !== "object") throw new Error("Nothing to save.");
  return saveProfile(getDb(), guest.id, {
    name: typeof profile.name === "string" ? profile.name : undefined,
    avatarDataUrl: typeof profile.avatarDataUrl === "string" ? profile.avatarDataUrl : undefined,
  });
}
