import type { Metadata } from "next";
import { Archivo, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  metadataBase: new URL("https://recalfy.com"),
  title: {
    default: "Recalfy — the memory that lives in your chats",
    template: "%s · Recalfy",
  },
  description:
    "Tell it once. Recalfy keeps every fact you give it, answers from memory, and speaks up at the right time — inside the chat app you already use.",
  openGraph: {
    title: "Recalfy — the memory that lives in your chats",
    description:
      "Tell it once. Recalfy keeps every fact you give it, answers from memory, and speaks up at the right time.",
    url: "https://recalfy.com",
    siteName: "Recalfy",
    type: "website",
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
        <ThemeProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
