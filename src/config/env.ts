import { ConfigService } from '@nestjs/config';

import { parseKey } from '../memory/vault';

/**
 * Typed view over the environment. Everything the app needs to boot is read
 * once, here, so a missing variable fails at startup rather than at 3am when
 * a reminder is due.
 */
export class Env {
  constructor(private readonly config: ConfigService) {}

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
  }

  get botToken(): string {
    return this.required('TELEGRAM_BOT_TOKEN');
  }

  /**
   * A self-run Telegram Bot API server, for the few who want one (bigger file
   * limits, or no traffic to api.telegram.org). Unset means Telegram's own.
   */
  get telegramApiRoot(): string | undefined {
    return this.config.get<string>('TELEGRAM_API_ROOT')?.trim().replace(/\/+$/, '') || undefined;
  }

  get webhookSecret(): string {
    return this.required('TELEGRAM_WEBHOOK_SECRET');
  }

  /**
   * `hosted` is recalfy.com: billing, the website's linking flow, a webhook.
   * `selfhost` is one person's own install: no billing, the owner linked at
   * boot, and long polling so no domain is needed.
   *
   * An explicit switch rather than something inferred from missing Paddle
   * variables. Inferring it would mean a production box that lost its billing
   * config quietly became free for everyone.
   */
  get selfHosted(): boolean {
    const mode = (this.config.get<string>('RECALFY_MODE') ?? 'hosted').trim().toLowerCase();
    if (mode !== 'hosted' && mode !== 'selfhost') {
      throw new Error(`RECALFY_MODE must be "hosted" or "selfhost", got "${mode}"`);
    }
    return mode === 'selfhost';
  }

  /**
   * The key that seals credentials at rest — see memory/vault.ts. Optional
   * so an install that predates it still boots: without it, nothing is
   * sealed and credentials are stored and prompted as they always were. A
   * key that is present but malformed fails at boot, because silently
   * running unsealed on a typo is the one outcome worse than either.
   */
  get memoryEncryptionKey(): Buffer | null {
    const raw = this.config.get<string>('MEMORY_ENCRYPTION_KEY')?.trim();
    return raw ? parseKey(raw) : null;
  }

  /**
   * The Telegram user id that owns a self-hosted install. Linked to an
   * account at boot, so the owner never goes through the website handshake.
   */
  get ownerTelegramId(): string | undefined {
    const value = this.config.get<string>('OWNER_TELEGRAM_ID')?.trim();
    if (!value) return undefined;
    if (!/^\d+$/.test(value)) throw new Error('OWNER_TELEGRAM_ID must be a numeric Telegram user id');
    return value;
  }

  /**
   * How updates arrive. Polling needs no public URL, which is what makes a
   * self-hosted install work behind a home router; the webhook is what
   * recalfy.com runs, fronted by Caddy.
   */
  get telegramMode(): 'polling' | 'webhook' {
    const fallback = this.selfHosted ? 'polling' : 'webhook';
    const mode = (this.config.get<string>('TELEGRAM_MODE') || fallback).trim().toLowerCase();
    if (mode !== 'polling' && mode !== 'webhook') {
      throw new Error(`TELEGRAM_MODE must be "polling" or "webhook", got "${mode}"`);
    }
    return mode;
  }

  /**
   * Show the reply while it is being written (`sendMessageDraft`), and draw
   * buttons under messages that offer one.
   *
   * Both default on and both exist to be turned off from the VPS without a
   * deploy — they lean on parts of the Bot API newer than anything else here,
   * and the failure mode of a newer API is usually "works until it doesn't".
   * Set either to 0/false/off and the bot falls back to what it did before:
   * a typing indicator, and messages with no keyboard.
   */
  get telegramStreaming(): boolean {
    return this.flag('TELEGRAM_STREAMING', true);
  }

  get telegramButtons(): boolean {
    return this.flag('TELEGRAM_BUTTONS', true);
  }

  private flag(key: string, fallback: boolean): boolean {
    const value = this.config.get<string>(key)?.trim().toLowerCase();
    if (value === undefined || value === '') return fallback;
    return !['0', 'false', 'off', 'no'].includes(value);
  }

  /**
   * WhatsApp is optional: the bot runs on Telegram alone if these are unset,
   * which is what keeps a half-configured deploy from failing to boot. The
   * adapter checks `whatsappEnabled` and stays dormant otherwise.
   */
  get whatsappEnabled(): boolean {
    return Boolean(
      this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') &&
        this.config.get<string>('WHATSAPP_ACCESS_TOKEN'),
    );
  }

  get whatsappPhoneNumberId(): string {
    return this.required('WHATSAPP_PHONE_NUMBER_ID');
  }

  /** System-user token. Permanent, unlike the 24-hour one on the dashboard. */
  get whatsappAccessToken(): string {
    return this.required('WHATSAPP_ACCESS_TOKEN');
  }

  /**
   * Echoed back during Meta's GET handshake. Any long random string.
   *
   * Optional rather than required, like the app secret below and for the same
   * reason: the webhook is reachable before WhatsApp is configured, and its
   * callers must be able to turn "not set" into a refusal rather than a crash.
   */
  get whatsappVerifyToken(): string | undefined {
    return this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
  }

  /**
   * The app secret, used to check the X-Hub-Signature-256 HMAC on every
   * webhook call. Without it any host that learns the URL can post messages,
   * so an absent secret has to mean "reject everything" — never "skip the
   * check", and never a 500, which Meta would retry.
   */
  get whatsappAppSecret(): string | undefined {
    return this.config.get<string>('WHATSAPP_APP_SECRET');
  }

  /**
   * Name of the approved utility template used to reach someone outside
   * WhatsApp's 24-hour window. One body parameter, which is the message text.
   */
  get whatsappNotifyTemplate(): string {
    return this.config.get<string>('WHATSAPP_NOTIFY_TEMPLATE') ?? 'recalfy_notification';
  }

  /** Language code the template was approved under, e.g. "en" or "en_US". */
  get whatsappTemplateLocale(): string {
    return this.config.get<string>('WHATSAPP_TEMPLATE_LOCALE') ?? 'en';
  }

  get graphApiVersion(): string {
    return this.config.get<string>('GRAPH_API_VERSION') ?? 'v23.0';
  }

  /**
   * Any OpenAI-compatible endpoint: OpenAI, OpenRouter, Z.ai, Ollama. The
   * `LLM_*` names are the ones to use; `ZAPI_KEY`, `ZAI_BASE_URL` and
   * `GLM_MODEL` are what recalfy.com was configured with first, still read so
   * that box keeps booting.
   */
  get glmApiKey(): string {
    const key = this.config.get<string>('LLM_API_KEY') || this.config.get<string>('ZAPI_KEY');
    if (!key) throw new Error('Missing required environment variable: LLM_API_KEY');
    return key;
  }

  get glmBaseUrl(): string {
    return (
      this.config.get<string>('LLM_BASE_URL') ||
      this.config.get<string>('ZAI_BASE_URL') ||
      'https://api.z.ai/api/paas/v4'
    );
  }

  /**
   * glm-4.7-flash is free but throttled hard enough to be unusable
   * conversationally; glm-5.2 has a 1M-token context and materially better
   * long-context/tool-use reliability than glm-4.7 (81.0 vs 62.0 on
   * Terminal-Bench 2.1 per Z.ai's docs).
   */
  get glmModel(): string {
    return this.config.get<string>('LLM_MODEL') || this.config.get<string>('GLM_MODEL') || 'glm-5.2';
  }

  /**
   * The price ids that tell Keep and Archive apart, shared verbatim with the
   * web app's `PADDLE_PRICE_*` variables.
   *
   * Optional, and unset means **everyone is treated as Archive**. That is the
   * safe direction: a variable missed on the VPS then costs us a few unenforced
   * limits, where the opposite default would cap paying customers' memories and
   * silently withdraw features they are being charged for. A limit that fails
   * to apply is a support ticket; a limit that wrongly applies is a refund.
   */
  get tierPrices(): { keep: string[]; archive: string[] } {
    const read = (key: string): string[] => {
      const value = this.config.get<string>(key);
      return value ? [value] : [];
    };
    return {
      keep: [...read('PADDLE_PRICE_KEEP_MONTH'), ...read('PADDLE_PRICE_KEEP_YEAR')],
      archive: [...read('PADDLE_PRICE_ARCHIVE_MONTH'), ...read('PADDLE_PRICE_ARCHIVE_YEAR')],
    };
  }

  get mongoUri(): string {
    return this.required('MONGODB_URI');
  }

  get mongoDb(): string {
    return this.config.get<string>('MONGODB_DB') ?? 'recalfy';
  }

  get publicUrl(): string {
    return this.required('PUBLIC_URL').replace(/\/+$/, '');
  }

  get port(): number {
    return Number(this.config.get<string>('PORT') ?? 3000);
  }

  /**
   * Loopback by default: on recalfy.com Caddy is the only thing that should
   * reach the process. A container sets 0.0.0.0 so its healthcheck and the
   * optional dashboard can.
   */
  get host(): string {
    return this.config.get<string>('HOST') || '127.0.0.1';
  }

  get defaultTimezone(): string {
    return this.config.get<string>('DEFAULT_TIMEZONE') ?? 'UTC';
  }
}

export const ENV = Symbol('ENV');
