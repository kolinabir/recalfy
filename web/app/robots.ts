import type { MetadataRoute } from "next";

/**
 * /login stays crawlable on purpose: its noindex meta tag can only be seen
 * if Google is allowed to fetch the page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/dashboard", "/api/"],
    },
    sitemap: "https://recalfy.com/sitemap.xml",
  };
}
