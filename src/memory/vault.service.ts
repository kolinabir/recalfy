import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Collection } from 'mongodb';

import { ENV, Env } from '../config/env';
import { UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';
import { openSealed, protect } from './vault';

/** Anything the vault can seal: one owner, one text, maybe a sealed original. */
interface Sealable {
  userId: UserId;
  text: string;
  sealed?: string;
}

/**
 * The vault, holding its key. See vault.ts for what it is for.
 *
 * With no key configured it is a pass-through: `protect` returns the text
 * untouched and `reveal` returns `text`, which is exactly how rows were
 * stored before it existed. Callers never branch on whether it is on.
 */
@Injectable()
export class Vault implements OnApplicationBootstrap {
  private readonly logger = new Logger(Vault.name);
  private readonly key: Buffer | null;

  constructor(
    @Inject(ENV) env: Env,
    private readonly mongo: MongoService,
  ) {
    this.key = env.memoryEncryptionKey;
  }

  /**
   * What to store: the masked text, plus the sealed original when there was
   * one. `known` are this turn's credential values; see `secretValues`.
   */
  protect(
    owner: UserId,
    text: string,
    known: readonly string[] = [],
  ): { text: string; sealed?: string } {
    return this.key ? protect(this.key, owner, text, known) : { text };
  }

  /**
   * The original text, for a person to read. Falls back to the masked text
   * rather than throwing: a row that will not open (key rotated away, row
   * restored into another install) should still show *something*, and the
   * masked form is the safe something.
   */
  reveal(row: Sealable): string {
    if (!row.sealed || !this.key) return row.text;
    try {
      return openSealed(this.key, row.userId, row.sealed);
    } catch (error) {
      this.logger.error(`Could not open a sealed row for ${row.userId}: ${message(error)}`);
      return row.text;
    }
  }

  /**
   * Seals credentials already sitting in plain text — rows written before the
   * vault, or before a key was configured. Idempotent and best-effort: a row
   * that is already sealed, or has nothing to hide, is left alone, and a
   * failure here is logged rather than keeping the bot from starting.
   *
   * The candidate filter is a cheap substring pre-check; `protect` makes the
   * actual decision, so a loose match costs a read and nothing else.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.key) {
      this.logger.warn(
        'MEMORY_ENCRYPTION_KEY is not set — credentials are stored in plain text and sent to the model. ' +
          'Generate one with: openssl rand -base64 32',
      );
      return;
    }
    try {
      const sealed =
        (await this.sweep(this.mongo.memories)) +
        (await this.sweep(this.mongo.messages)) +
        (await this.sweep(this.mongo.reminders));
      if (sealed > 0) this.logger.log(`sealed ${sealed} existing row(s) holding a credential`);
    } catch (error) {
      this.logger.error(`Credential sweep failed: ${message(error)}`);
    }
  }

  private async sweep<T extends Sealable>(collection: Collection<T>): Promise<number> {
    const candidates = collection.find(
      {
        sealed: { $exists: false },
        text: { $regex: CANDIDATE, $options: 'i' },
      } as never,
      { projection: { _id: 1, userId: 1, text: 1 } },
    );

    let count = 0;
    for await (const row of candidates) {
      const next = this.protect(row.userId, row.text);
      if (!next.sealed) continue;
      await collection.updateOne({ _id: row._id } as never, {
        $set: { text: next.text, sealed: next.sealed },
      } as never);
      count++;
    }
    return count;
  }
}

/** Every credential word `maskSecret` knows starts with one of these. */
const CANDIDATE =
  'pass|pin|otp|cvv|one.?time|api|secret|access|private|licen|product|recovery|encryption|seed|code';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
