/**
 * Registers, inspects, or removes the Telegram webhook.
 *
 *   npm run webhook:set
 *   npm run webhook:info
 *   npm run webhook:delete
 */
import 'dotenv/config';
import { Bot } from 'grammy';

import { WEBHOOK_PATH } from '../src/telegram/webhook.controller';

type Action = 'set' | 'info' | 'delete';

async function main(): Promise<void> {
  const action = (process.argv[2] ?? 'info') as Action;
  const bot = new Bot(required('TELEGRAM_BOT_TOKEN'));

  switch (action) {
    case 'set': {
      const url = `${required('PUBLIC_URL').replace(/\/+$/, '')}/${WEBHOOK_PATH}`;
      await bot.api.setWebhook(url, {
        secret_token: required('TELEGRAM_WEBHOOK_SECRET'),
        // Only what the bot actually consumes; anything else is wasted traffic.
        // `inline_query` is not implied by `message` — omit it and Telegram
        // silently never delivers one, which looks exactly like a broken
        // handler.
        allowed_updates: ['message', 'inline_query'],
        // Queued updates are delivered by default — after fixing a broken
        // webhook you usually want them. Pass --drop to discard instead.
        drop_pending_updates: process.argv.includes('--drop'),
      });
      console.log(`Webhook set to ${url}`);
      break;
    }

    case 'delete':
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      console.log('Webhook deleted');
      break;

    case 'info':
      console.log(await bot.api.getWebhookInfo());
      break;

    default:
      throw new Error(`Unknown action "${action}". Use set, info, or delete.`);
  }
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
