import { CHANGELOG, CHANGE_KINDS, entryId } from "@/lib/changelog-data";
import { SITE } from "@/lib/sections";

/**
 * The changelog as a feed.
 *
 * A changelog is the one page on a product site people want delivered rather
 * than revisited, and a feed is also how the page gets crawled on its own
 * schedule instead of on the sitemap's guess. Built from the same array the
 * page renders, so the two can never disagree.
 */

/** RFC 822, which is what RSS requires — not ISO, and not the locale's idea of a date. */
function pubDate(iso: string): string {
  // Midday UTC: far enough from either midnight that no reader's timezone
  // shifts an entry onto the day before or after the page shows.
  return new Date(`${iso}T12:00:00Z`).toUTCString();
}

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const items = CHANGELOG.map((entry) => {
    const lines = entry.changes
      .map((change) => `${CHANGE_KINDS[change.kind]}: ${change.text}`)
      .join("\n");
    const description = entry.body ? `${entry.body}\n\n${lines}` : lines;

    // The anchor, not the bare page: a reader clicking a three-week-old item
    // should land on it rather than at the top of a list.
    const url = `${SITE}/changelog#${entryId(entry)}`;

    return `    <item>
      <title>${escape(entry.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${entryId(entry)}</guid>
      <pubDate>${pubDate(entry.date)}</pubDate>
      <description>${escape(description)}</description>
    </item>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Recalfy changelog</title>
    <link>${SITE}/changelog</link>
    <atom:link href="${SITE}/changelog/rss.xml" rel="self" type="application/rss+xml" />
    <description>What shipped in Recalfy, and when.</description>
    <language>en</language>
    <lastBuildDate>${pubDate(CHANGELOG[0].date)}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Cached at the edge for an hour: releases are not minutes apart.
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
