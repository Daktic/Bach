import "server-only";
import { SolidAuth, type SolidAuthConfig } from "@auth/solid-start";
import Google from "@auth/core/providers/google";
import Apple from "@auth/core/providers/apple";
import { isInvitedEmail } from "~/lib/server/guest-list";

export const authConfig: SolidAuthConfig = {
  // Must match the route at src/routes/api/auth/[...solidauth].ts. Auth.js
  // otherwise assumes "/auth" and rejects every request as UnknownAction.
  basePath: "/api/auth",

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      // APPLE_SECRET is a signed JWT — see .env.local for generation instructions
      clientSecret: process.env.APPLE_SECRET!,
    }),
  ],

  pages: {
    signIn: "/sign-in",
    // Errors (including AccessDenied for uninvited emails) land on
    // /sign-in?error=<code>, which explains what happened.
    error: "/sign-in",
  },

  callbacks: {
    // AUTH-3: invite-only. OAuth proves who someone is; the guest list decides
    // whether they get in. Returning false issues no session and redirects to
    // /sign-in?error=AccessDenied. There is no self-sign-up path.
    async signIn({ user, account, profile }) {
      // Google can return accounts whose email was never verified. Only trust
      // verified addresses, otherwise anyone could claim an invited email.
      if (account?.provider === "google" && profile?.email_verified !== true) {
        return false;
      }
      return isInvitedEmail(user?.email ?? profile?.email ?? null);
    },

    // Runs whenever Auth.js issues or refreshes the session token, including on
    // its public /api/auth/session endpoint. Returning null for an email that's
    // no longer on the list makes Auth.js clear the cookie rather than re-issue
    // it, so a removed guest's session can't be kept alive.
    async jwt({ token }) {
      return isInvitedEmail(token.email) ? token : null;
    },
  },

  // JWT sessions — no database adapter needed. The session's email is checked
  // against the guest list on every request (src/lib/server/session.ts), so
  // removing someone from GUEST_EMAILS locks them out straight away.
  session: {
    strategy: "jwt",
  },

  trustHost: true,
};

export const { GET, POST } = SolidAuth(authConfig);
