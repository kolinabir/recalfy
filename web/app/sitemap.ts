import type { MetadataRoute } from "next";

import { CHANGELOG_RANGE } from "@/lib/changelog-data";
import { SITE as BASE } from "@/lib/sections";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/examples`, changeFrequency: "monthly", priority: 0.9 },
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
