import "server-only";

import type { DetachedHandle } from "@/lib/disconnect";

/**
 * The last thing a detached chat hears.
 *
 * Worth sending for the reason a bank texts you about a card being cancelled:
 * if it was not you, this is how you find out. It also closes the loop for
 * whoever *is* holding the phone — they learn it is over rather than sitting
 * there wondering why the bot went quiet.
 *
 * Telegram only. WhatsApp outside its 24-hour window costs a billed template,
 * and paying Meta to break the news to a thief is not a good trade.
 *
 * Best-effort throughout: the disconnect has already happened by the time
 * this runs, and nothing here may undo or delay it.
 */

const GOODBYE =
  "This chat has been disconnected from its Recalfy account, from the dashboard.\n\n" +
  "I won't answer here again until it's reconnected. If that wasn't you, sign in at recalfy.com and change your Google password.";

export async function sayGoodbye(detached: DetachedHandle): Promise<void> {
  if (detached.channel !== "telegram") return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: detached.handle, text: GOODBYE }),
    });
  } catch {
    // Blocked the bot, deleted the chat, network. None of it changes the fact
    // that the link is already gone.
  }
}
