import { query } from "@solidjs/router";
import { getMe } from "~/lib/api/me";

// Cached, de-duplicated client reads. Several components need the signed-in
// guest (nav, profile, flights, crew bar), so they share one request:
//   const me = createAsync(() => meQuery());
export const meQuery = query(() => getMe(), "me");
