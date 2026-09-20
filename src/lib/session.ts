"use server";
import { getSession } from "@auth/solid-start";
import { getRequestEvent } from "solid-js/web";
import { redirect } from "@solidjs/router";
import { authConfig } from "~/lib/auth";
import type { Session } from "@auth/core/types";

export async function getAuthSession(): Promise<Session | null> {
  const event = getRequestEvent();
  if (!event) return null;
  return getSession(event.request, authConfig);
}

// Throws a redirect to /sign-in if not authenticated.
// Use inside createAsync on any protected route.
export async function requireSession(): Promise<Session> {
  const session = await getAuthSession();
  if (!session?.user) throw redirect("/sign-in");
  return session;
}
