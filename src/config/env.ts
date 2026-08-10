import { ConfigService } from '@nestjs/config';

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

  get webhookSecret(): string {
    return this.required('TELEGRAM_WEBHOOK_SECRET');
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

  /** Echoed back during Meta's GET handshake. Any long random string. */
  get whatsappVerifyToken(): string {
    return this.required('WHATSAPP_VERIFY_TOKEN');
  }

  /**
   * The app secret, used to check the X-Hub-Signature-256 HMAC on every
   * webhook call. Without it any host that learns the URL can post messages.
   */
  get whatsappAppSecret(): string {
    return this.required('WHATSAPP_APP_SECRET');
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

  get glmApiKey(): string {
    return this.required('ZAPI_KEY');
  }

  /** Z.ai is OpenAI-wire-compatible, so the official `openai` SDK talks to it. */
  get glmBaseUrl(): string {
    return this.config.get<string>('ZAI_BASE_URL') ?? 'https://api.z.ai/api/paas/v4';
  }

  /**
   * glm-4.7-flash is free but throttled hard enough to be unusable
   * conversationally; glm-5.2 has a 1M-token context and materially better
   * long-context/tool-use reliability than glm-4.7 (81.0 vs 62.0 on
   * Terminal-Bench 2.1 per Z.ai's docs).
   */
  get glmModel(): string {
    return this.config.get<string>('GLM_MODEL') ?? 'glm-5.2';
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

  get defaultTimezone(): string {
    return this.config.get<string>('DEFAULT_TIMEZONE') ?? 'UTC';
  }
}

export const ENV = Symbol('ENV');
