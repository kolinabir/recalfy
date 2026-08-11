import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

import { paddleEnvironment } from "./config";

/**
 * The server half of the Paddle integration: the API key and the webhook
 * signing secret. `server-only` makes importing this from a "use client"
 * module a build error rather than a leaked key.
 */

let instance: Paddle | undefined;

export function paddle(): Paddle {
  if (instance) return instance;

  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY is not set.");

  instance = new Paddle(key, {
    environment:
      paddleEnvironment() === "production"
        ? Environment.production
        : Environment.sandbox,
  });
  return instance;
}

/**
 * Not the API key. This is the per-destination secret from Developer tools >
 * Notifications, and using the wrong one makes every delivery fail to verify.
 */
export function webhookSecret(): string {
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_NOTIFICATION_WEBHOOK_SECRET is not set.");
  return secret;
}
