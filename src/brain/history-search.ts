import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { MessageDoc, UserId } from '../mongo/collections';
import { MongoService } from '../mongo/mongo.service';

/** Enough hits to answer "what did I say about X", few enough to stay cheap. */
const MAX_HITS = 12;
/** A hit is an excerpt, not a document dump. */
const MAX_EXCERPT_CHARS = 240;

/**
 * Episodic recall: keyword search over the raw transcript.
 *
 * The memory document holds distilled facts; this reaches everything that was
 * ever actually said. A plain Mongo `$text` index does the work — no
 * embeddings, no Atlas Search, exactly the stage-2 exit ramp from DESIGN.md §9
 * arriving as a tool instead of a prompt change.
 */
@Injectable()
export class HistorySearch {
  constructor(private readonly mongo: MongoService) {}

  async search(userId: UserId, query: string, timezone: string): Promise<string[]> {
    const hits = await this.mongo.messages
      .find(
        { userId, $text: { $search: query } },
        { projection: { score: { $meta: 'textScore' } } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(MAX_HITS)
      .toArray();

    // Best matches first for relevance, then re-ordered by time so the model
    // reads a coherent thread rather than a shuffled one.
    return formatHits(
      hits.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      timezone,
    );
  }
}

/** One dated line per hit, e.g. `12 Jul 2026 — user: the geyser is leaking`. */
export function formatHits(hits: MessageDoc[], timezone: string): string[] {
  return hits.map((hit) => {
    const day = DateTime.fromJSDate(hit.createdAt, { zone: timezone }).toFormat('d LLL yyyy');
    return `${day} — ${hit.role}: ${excerpt(hit.text)}`;
  });
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= MAX_EXCERPT_CHARS ? flat : `${flat.slice(0, MAX_EXCERPT_CHARS)}…`;
}
