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
