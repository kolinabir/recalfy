import type { MetadataRoute } from "next";

import { CHANGELOG_RANGE } from "@/lib/changelog-data";
import { SITE as BASE } from "@/lib/sections";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // With a trailing slash, so the entry is byte-identical to where the apex
    // 308 lands. The two forms are the same URL to a crawler, but matching the
    // redirect target exactly leaves nothing for anyone to normalise.
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/examples`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/features`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${BASE}/changelog`,
      // Taken from the newest entry, so a crawler is told the truth about
      // when this page last changed rather than a guess that never moves.
      lastModified: new Date(`${CHANGELOG_RANGE.newest}T12:00:00Z`),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/refunds`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
