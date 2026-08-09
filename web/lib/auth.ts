import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { db } from "./mongo";

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: ["https://recalfy.com", "http://localhost:3000"],
  user: {
    additionalFields: {
      // Written only by the bot, once it has seen a valid token in a /start.
      // input:false keeps it out of client-supplied update payloads, so nobody
      // can claim a Telegram id by POSTing it at the account endpoint.
      telegramUserId: { type: "number", required: false, input: false },
    },
  },
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
