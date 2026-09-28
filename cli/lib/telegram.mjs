/**
 * The few Bot API calls setup needs, over plain fetch. The token never leaves
 * this machine except to api.telegram.org (or TELEGRAM_API_ROOT, if set).
 */

async function call(token, method, body = {}, { timeoutMs = 15_000 } = {}) {
  const root = (process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');
  const response = await fetch(`${root}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await response.json().catch(() => ({}));
  if (!payload.ok) {
    const error = new Error(payload.description || `Telegram answered ${response.status}`);
    error.code = payload.error_code ?? response.status;
    throw error;
  }
  return payload.result;
}

export const looksLikeToken = (value) => /^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(value.trim());

/** The bot's own profile, or a readable reason the token did not work. */
export async function whoIsBot(token) {
  try {
    return { bot: await call(token, 'getMe') };
  } catch (error) {
    if (error.code === 401 || error.code === 404) {
      return { error: 'Telegram does not recognise that token. Copy it again from @BotFather.' };
    }
    return { error: `Could not reach Telegram: ${error.message}` };
  }
}

export async function webhookUrl(token) {
  const info = await call(token, 'getWebhookInfo');
  return info.url || null;
}

export async function dropWebhook(token) {
  await call(token, 'deleteWebhook');
}

/**
 * Waits for the first private message to the bot and returns who sent it.
 *
 * Anything already queued is skipped first, so an old "hi" from last week
 * cannot make a stranger the owner. The message that is found is consumed, so
 * the running bot does not answer it a second time.
 */
export async function waitForOwner(token, { timeoutMs = 180_000, signal } = {}) {
  const pending = await call(token, 'getUpdates', { offset: -1, timeout: 0 });
  let offset = pending.length ? pending[pending.length - 1].update_id + 1 : 0;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !signal?.aborted) {
    const updates = await call(
      token,
      'getUpdates',
      { offset, timeout: 20, allowed_updates: ['message'] },
      { timeoutMs: 30_000 },
    );
    for (const update of updates) {
      offset = update.update_id + 1;
      const message = update.message;
      if (message?.chat?.type === 'private' && message.from && !message.from.is_bot) {
        await call(token, 'getUpdates', { offset, timeout: 0 });
        return message.from;
      }
    }
  }
  return null;
}

export async function say(token, chatId, text) {
  await call(token, 'sendMessage', { chat_id: chatId, text }).catch(() => {});
}
