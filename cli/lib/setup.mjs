import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';

import * as p from '@clack/prompts';

import { botHealth, compose, dockerProblem, writeCompose } from './docker.mjs';
import { readEnv, writeEnv } from './env-file.mjs';
import { PROVIDERS, tryModel } from './llm.mjs';
import { ENV_FILE, HOME } from './paths.mjs';
import {
  dropWebhook,
  looksLikeToken,
  say,
  waitForOwner,
  webhookUrl,
  whoIsBot,
} from './telegram.mjs';

/** Every prompt goes through this: Ctrl+C at any point leaves nothing half-written. */
function answer(value) {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled. Nothing was changed.');
    process.exit(0);
  }
  return value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function setup() {
  console.log();
  p.intro(' Recalfy setup ');

  const problem = dockerProblem();
  if (problem) {
    p.log.error(problem);
    p.outro('Fix that, then run `npx recalfy` again.');
    process.exit(1);
  }

  const previous = readEnv(ENV_FILE);
  if (existsSync(ENV_FILE)) {
    const again = answer(
      await p.confirm({
        message: `Recalfy is already set up in ${HOME}. Go through setup again?`,
        initialValue: false,
      }),
    );
    if (!again) {
      p.outro('Nothing changed. `npx recalfy status` shows how it is doing.');
      return;
    }
  }

  // --- Telegram ------------------------------------------------------------
  p.note(
    'Open Telegram, message @BotFather, send /newbot, and follow the two questions.\n' +
      'It answers with a token that looks like 7412345678:AAH…',
    'Step 1 of 3 — your bot',
  );

  let token;
  let bot;
  for (;;) {
    token = answer(
      await p.password({
        message: 'Paste the bot token',
        validate: (value) =>
          value && looksLikeToken(value) ? undefined : 'That does not look like a bot token.',
      }),
    ).trim();

    const spin = p.spinner();
    spin.start('Checking the token with Telegram');
    const result = await whoIsBot(token);
    if (result.bot) {
      bot = result.bot;
      spin.stop(`Connected to @${bot.username}`);
      break;
    }
    spin.stop(result.error, 1);
  }

  // A bot already wired to a webhook (a previous install on a server, say)
  // would never see the owner's message, and would fight the new install.
  const existingHook = await webhookUrl(token).catch(() => null);
  if (existingHook) {
    const take = answer(
      await p.confirm({
        message: `This bot currently sends its messages to ${existingHook}. Point it at this install instead?`,
      }),
    );
    if (!take) {
      p.cancel('Left as it was. Create a separate bot in @BotFather for this install.');
      process.exit(0);
    }
    await dropWebhook(token);
  }

  // --- Model ---------------------------------------------------------------
  p.note(
    'Recalfy needs a chat model that can call tools. Any OpenAI-compatible API works.',
    'Step 2 of 3 — the AI model',
  );

  const providerKey = answer(
    await p.select({
      message: 'Which provider?',
      options: Object.entries(PROVIDERS).map(([value, provider]) => ({
        value,
        label: provider.label,
        hint: provider.hint,
      })),
    }),
  );
  const provider = PROVIDERS[providerKey];

  let baseUrl = provider.baseUrl;
  let model = provider.model;
  let apiKey = '';
  for (;;) {
    if (!provider.baseUrl) {
      baseUrl = answer(
        await p.text({
          message: 'API base URL (ends in /v1 for most providers)',
          placeholder: 'https://api.groq.com/openai/v1',
          initialValue: baseUrl,
          validate: (value) => (/^https?:\/\//.test(value ?? '') ? undefined : 'Start it with https://'),
        }),
      ).trim();
    }
    if (provider.needsKey) {
      apiKey = answer(
        await p.password({
          message: `${provider.label} API key`,
          validate: (value) => (value?.trim() ? undefined : 'The key is required.'),
        }),
      ).trim();
    }
    model = answer(
      await p.text({
        message: 'Model',
        initialValue: model,
        validate: (value) => (value?.trim() ? undefined : 'Name a model.'),
      }),
    ).trim();

    const spin = p.spinner();
    spin.start('Sending the model a test message');
    const probe = await tryModel({ baseUrl: provider.probeUrl ?? baseUrl, apiKey, model });
    if (probe.ok) {
      spin.stop(`${model} answered`);
      break;
    }
    spin.stop(probe.reason, 1);
    if (providerKey === 'ollama' && probe.field === 'url') {
      p.log.info('Is Ollama running? Start it, then `ollama pull ' + model + '`.');
    }
    const retry = answer(await p.confirm({ message: 'Try again?' }));
    if (!retry) {
      p.cancel('Setup stopped before anything was written.');
      process.exit(1);
    }
  }

  // --- Owner ---------------------------------------------------------------
  p.note(
    `Open Telegram and send any message to @${bot.username}.\n` +
      'Whoever sends it becomes the owner — the only person this bot will talk to.',
    'Step 3 of 3 — you',
  );

  let owner = previous.OWNER_TELEGRAM_ID ? { id: previous.OWNER_TELEGRAM_ID } : null;
  if (owner) {
    const keep = answer(
      await p.confirm({ message: `Keep Telegram user ${owner.id} as the owner?`, initialValue: true }),
    );
    if (!keep) owner = null;
  }

  if (!owner) {
    const spin = p.spinner();
    spin.start(`Waiting for your message to @${bot.username} (t.me/${bot.username})`);
    const from = await waitForOwner(token).catch(() => null);
    if (from) {
      owner = from;
      spin.stop(`Got it — ${from.first_name ?? 'you'} (id ${from.id}) is the owner`);
      await say(token, from.id, "✓ You're the owner. Finishing setup — I'll message you when I'm ready.");
    } else {
      spin.stop('No message arrived.', 1);
      const typed = answer(
        await p.text({
          message: 'Enter your Telegram user id instead (@userinfobot tells you)',
          validate: (value) => (/^\d+$/.test(value?.trim() ?? '') ? undefined : 'Digits only.'),
        }),
      );
      owner = { id: typed.trim() };
    }
  }

  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const timezone = answer(
    await p.text({
      message: 'Your timezone (reminders fire in it — you can also just tell the bot later)',
      initialValue: previous.DEFAULT_TIMEZONE || detected,
    }),
  ).trim();

  // --- Write and start -----------------------------------------------------
  mkdirSync(HOME, { recursive: true, mode: 0o700 });
  writeEnv(ENV_FILE, {
    // Carried over, so a re-run does not silently drop something added by hand.
    ...previous,
    RECALFY_MODE: 'selfhost',
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_MODE: 'polling',
    TELEGRAM_WEBHOOK_SECRET: previous.TELEGRAM_WEBHOOK_SECRET || randomBytes(32).toString('hex'),
    OWNER_TELEGRAM_ID: String(owner.id),
    LLM_BASE_URL: baseUrl,
    LLM_API_KEY: apiKey || 'none',
    LLM_MODEL: model,
    DEFAULT_TIMEZONE: timezone,
  });
  writeCompose();
  p.log.success(`Saved to ${ENV_FILE}`);

  const spin = p.spinner();
  spin.start('Downloading Recalfy (first time takes a minute)');
  if ((await compose(['pull', '--quiet'], { quiet: true })) !== 0) {
    spin.stop('Download failed — check your internet connection, then run `npx recalfy start`.', 1);
    process.exit(1);
  }
  spin.message('Starting');
  if ((await compose(['up', '-d', '--remove-orphans'], { quiet: true })) !== 0) {
    spin.stop('Could not start. `npx recalfy logs` shows why.', 1);
    process.exit(1);
  }

  spin.message('Waiting for it to come up');
  let health = null;
  for (let i = 0; i < 60; i++) {
    health = botHealth();
    if (health === 'healthy' || health === 'exited' || health === 'unhealthy') break;
    await sleep(2_000);
  }
  if (health !== 'healthy') {
    spin.stop(`It did not come up (${health ?? 'not running'}). \`npx recalfy logs\` shows why.`, 1);
    process.exit(1);
  }
  spin.stop('Recalfy is running');

  await say(
    token,
    owner.id,
    "I'm ready. Tell me anything you'd rather not hold in your head — or ask me to remind you of something.",
  );

  p.note(
    [
      'npx recalfy status     is it running?',
      'npx recalfy logs       what it is doing',
      'npx recalfy update     get the newest version',
      'npx recalfy backup     save a copy of your memory',
      'npx recalfy export     your memory as Markdown',
      'npx recalfy stop       turn it off',
    ].join('\n'),
    'Managing it',
  );
  p.outro(`Go say hi to @${bot.username} → https://t.me/${bot.username}`);
}

