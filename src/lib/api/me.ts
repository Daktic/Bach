"use server";

import { requireGuest } from "~/lib/server/session";
import type { Me } from "~/lib/types";

/** The signed-in guest (AUTH-4). Use `meQuery` from ~/lib/queries on the client. */
export async function getMe(): Promise<Me> {
  const { guest, email, image } = await requireGuest();
  return {
    id: guest.id,
    name: guest.name,
    initials: guest.initials,
    email,
    image,
  };
}
