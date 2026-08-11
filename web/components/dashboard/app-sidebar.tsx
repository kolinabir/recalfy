"use client";

import {
  AlarmClock,
  CreditCard,
  Home,
  Library,
  LogOut,
  MessageCircle,
  Send,
  Settings2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Mark } from "@/components/wordmark";
import { signOut } from "@/lib/auth-client";

const LIBRARY = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/memories", label: "Memories", icon: Library },
  { href: "/dashboard/reminders", label: "Reminders", icon: AlarmClock },
];

const ACCOUNT = [
  { href: "/dashboard/telegram", label: "Telegram", icon: Send },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
];

/** Rows that get the "not connected" dot while no chat is attached. */
const CHAT_ROUTES = ["/dashboard/telegram", "/dashboard/whatsapp"];

/**
 * The dashboard's frame. Same discipline as the rest of the site: canvas
 * background, hairline divider, amber only on the live connection dot.
 */
export function AppSidebar({
  name,
  email,
  image,
  linked,
  plan,
}: {
  name?: string | null;
  email: string;
  image?: string | null;
  linked: boolean;
  /** Plan name while one is active, null otherwise. */
  plan: string | null;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Recalfy — home">
              <Link href="/" className="group">
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-s1"
                >
                  <Mark className="size-4.5" />
                </span>
                <span className="display text-[0.9375rem] font-semibold tracking-[-0.02em] text-fg">
                  Recalfy
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="eyebrow">Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={LIBRARY} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="eyebrow">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList items={ACCOUNT} pathname={pathname} badge={!linked} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu
          name={name}
          email={email}
          image={image}
          linked={linked}
          plan={plan}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavList({
  items,
  pathname,
  badge,
}: {
  items: { href: string; label: string; icon: React.ComponentType }[];
  pathname: string;
  badge?: boolean;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
                {badge && CHAT_ROUTES.includes(item.href) ? (
                  <span
                    aria-label="Not connected"
                    className="ml-auto size-1.5 rounded-full bg-fg-faint/60"
                  />
                ) : null}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function UserMenu({
  name,
  email,
  image,
  linked,
  plan,
}: {
  name?: string | null;
  email: string;
  image?: string | null;
  linked: boolean;
  plan: string | null;
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [pending, setPending] = useState(false);

  const source = name?.trim() || email;
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={email}>
              {image ? (
                <Image
                  src={image}
                  alt=""
                  width={32}
                  height={32}
                  referrerPolicy="no-referrer"
                  className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-line"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent font-mono text-[0.625rem] text-[var(--accent-ink)]">
                  {initials}
                </span>
              )}
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-[0.8125rem] text-fg">
                  {name ?? "Account"}
                </span>
                {/*
                  Was `fg-faint` at 10px, which measured too dim to read in
                  either theme — it is the smallest type in the product and it
                  had the lowest contrast. Lifted a step and given the thing
                  people actually want here: which plan they are on.
                */}
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className={
                      linked
                        ? "size-1 shrink-0 rounded-full bg-accent"
                        : "size-1 shrink-0 rounded-full bg-fg-faint/70"
                    }
                  />
                  <span className="truncate font-mono text-[0.6875rem] text-fg-subtle">
                    {plan ?? "No plan"}
                    <span className="text-fg-faint">
                      {linked ? " · connected" : " · not connected"}
                    </span>
                  </span>
                </span>
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            className="w-56 rounded-lg border-line bg-s1"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="grid leading-tight">
                <span className="truncate text-[0.8125rem]">{name}</span>
                <span className="truncate font-mono text-[0.625rem] text-fg-faint">
                  {email}
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-line" />
            <DropdownMenuItem
              disabled={pending}
              onSelect={async () => {
                setPending(true);
                await signOut();
                router.push("/");
                router.refresh();
              }}
            >
              <LogOut />
              {pending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
