import { SolidAuth, type SolidAuthConfig } from "@auth/solid-start";
import Google from "@auth/core/providers/google";
import Apple from "@auth/core/providers/apple";

export const authConfig: SolidAuthConfig = {
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
    error: "/sign-in",
  },

  // JWT sessions — no database needed until Turso/Drizzle is wired up.
  // Replace with the DrizzleAdapter when ADR-0007 is implemented.
  session: {
    strategy: "jwt",
  },

  trustHost: true,
};

export const { GET, POST } = SolidAuth(authConfig);
