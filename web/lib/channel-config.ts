import "server-only";

import type { Channel } from "@/lib/channels";

export type { Channel };

/**
 * Where the bot lives on each chat, read from the environment once so a page
 * never reaches for a raw `process.env` key — and, more importantly, so that
 * every part of the app agrees about it.
 *
 * That agreement is the whole point. This module used to answer only "should
 * we show a connect button", while `linking.ts` read the same variable itself
 * and applied a different rule: this one defaulted the Telegram handle, that
 * one did not. The result was a page confidently offering "@recalfy_bot" and a
 * button that answered 500 — the failure looked like a bug in the handshake
 * rather than a missing variable, which is exactly the wrong place to look.
 *
 * `configured` is the honest answer to "can someone connect this right now".
 * WhatsApp stays dark until a phone number is registered with Meta, and a
 * connect button that cannot work is worse than no button.
 */
export interface ChannelConfig {
  channel: Channel;
  /**
   * The raw target used to build a deep link: a bare Telegram username
   * ("recalfy_bot") or E.164 digits with no "+". Undefined exactly when
   * `configured` is false.
   */
  handle?: string;
  /** The same thing dressed for display: "@recalfy_bot", "+880 1712345678". */
  address: string;
  configured: boolean;
}

/**
 * The bot's handle is public, single-valued, and baked into the marketing copy
 * and the privacy policy, so falling back to it beats failing closed: an unset
 * variable then costs nothing rather than breaking the one action the product
 * is gated behind. It is stated once, here, and everything else reads it.
 */
const TELEGRAM_FALLBACK = "recalfy_bot";

export function channelConfig(channel: Channel): ChannelConfig {
  if (channel === "telegram") {
    const username = (
      process.env.TELEGRAM_BOT_USERNAME ?? TELEGRAM_FALLBACK
    ).replace(/^@/, "");
    return { channel, handle: username, address: `@${username}`, configured: true };
  }

  const digits = process.env.WHATSAPP_BUSINESS_NUMBER?.replace(/\D/g, "");
  return {
    channel,
    handle: digits || undefined,
    address: digits ? formatE164(digits) : "not configured yet",
    configured: Boolean(digits),
  };
}

/** `8801712345678` → `+880 1712345678`. Readable, still copy-pasteable. */
function formatE164(digits: string): string {
  if (digits.length < 10) return `+${digits}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
}
