import "server-only";

import type { Channel } from "@/lib/channels";

export type { Channel };

/**
 * Where the bot lives on each chat, read from the environment once so a page
 * never reaches for a raw `process.env` key.
 *
 * `configured` is the honest answer to "can someone connect this right now" —
 * WhatsApp stays dark until a phone number is registered with Meta, and a
 * connect button that cannot work is worse than no button.
 */
export interface ChannelConfig {
  channel: Channel;
  /** Public address: "@recalfy_bot", or "+880 1XXX XXXXXX". */
  address: string;
  configured: boolean;
}

export function channelConfig(channel: Channel): ChannelConfig {
  if (channel === "telegram") {
    const username = process.env.TELEGRAM_BOT_USERNAME ?? "recalfy_bot";
    return { channel, address: `@${username}`, configured: true };
  }

  const number = process.env.WHATSAPP_BUSINESS_NUMBER;
  return {
    channel,
    address: number ? formatE164(number) : "not configured yet",
    configured: Boolean(number),
  };
}

/** `8801712345678` → `+880 1712345678`. Readable, still copy-pasteable. */
function formatE164(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length < 10) return `+${clean}`;
  return `+${clean.slice(0, 3)} ${clean.slice(3)}`;
}
