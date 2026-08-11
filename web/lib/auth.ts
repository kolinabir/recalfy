import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { db } from "./mongo";

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // Both hosts: Vercel 308-redirects the apex to www, so www is the origin a
  // browser actually posts from. Listing only the apex leaves every sign-in
  // arriving from an origin Better Auth does not trust.
  trustedOrigins: [
    "https://www.recalfy.com",
    "https://recalfy.com",
    "http://localhost:3000",
  ],
  // `channels` is deliberately not declared as an additionalField. The bot
  // owns it, nothing client-side may set it, and the dashboard reads it
  // straight from the collection — declaring it here would only widen the
  // account-update surface for no gain.
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  // nextCookies() has to be last in the array — it flushes Set-Cookie headers
  // that earlier plugins may have queued.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
