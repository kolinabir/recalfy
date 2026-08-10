import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recalfy",
    short_name: "Recalfy",
    description:
      "The memory that texts back — keeps every fact, answers when you ask, messages you first when the moment comes.",
    start_url: "/",
    display: "browser",
    background_color: "#141418",
    theme_color: "#141418",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
