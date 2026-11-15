import { query } from "@solidjs/router";
import { getCrew } from "~/lib/api/crew";
import { getMe } from "~/lib/api/me";

// Cached, de-duplicated client reads. Several components need the signed-in
// guest (nav, profile, flights, crew bar), so they share one request:
//   const me = createAsync(() => meQuery());
export const meQuery = query(() => getMe(), "me");

/** Everyone on the roster with their display name and photo (chat, "Who's here"). */
export const crewQuery = query(() => getCrew(), "crew");
