import type { Metadata } from "next";
import { Archivo, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  // www, not the apex: the site is served on www and the sitemap declares www.
  // A canonical pointing at the apex while the sitemap points at www splits the
  // same page across two hosts and asks Google to pick — so it must match.
  metadataBase: new URL("https://www.recalfy.com"),
  title: {
    default: "Recalfy — the memory that lives in your chats",
    template: "%s · Recalfy",
  },
  description:
    "Tell it once. Recalfy keeps every fact you give it, answers from memory, and speaks up at the right time — inside the chat app you already use.",
  applicationName: "Recalfy",
  category: "productivity",
  // Resolves per page against metadataBase, so every route gets a canonical.
  alternates: { canonical: "./" },
  openGraph: {
    title: "Recalfy — the memory that lives in your chats",
    description:
      "Tell it once. Recalfy keeps every fact you give it, answers from memory, and speaks up at the right time.",
    url: "https://www.recalfy.com",
    siteName: "Recalfy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recalfy — the memory that lives in your chats",
    description:
      "Tell it once. Recalfy keeps every fact you give it, answers from memory, and speaks up at the right time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${hanken.variable} ${archivo.variable} ${jetbrains.variable}`}
      >
        {/*
          Motion serialises its hidden `initial` state into the SSR markup, so
          without JS the page would render invisible. This guarantees content
          regardless of whether the animations ever run.
        */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;filter:none!important;transform:none!important}`}</style>
        </noscript>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
