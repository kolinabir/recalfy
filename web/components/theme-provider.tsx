"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Dark is the design, not a preference — light is a supported alternate, so the
 * `dark` class is the unset default and `light` is what gets added.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      value={{ light: "light", dark: "dark" }}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
