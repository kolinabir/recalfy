"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/memories": "Memories",
  "/dashboard/reminders": "Reminders",
  "/dashboard/telegram": "Telegram",
  "/dashboard/settings": "Settings",
};

/** Slim top bar: collapse control, where-am-I, theme. Nothing else. */
export function DashHeader() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1 text-fg-subtle hover:text-fg" />
      <Separator orientation="vertical" className="mx-1 !h-4 bg-line" />
      <span className="eyebrow">{title}</span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
