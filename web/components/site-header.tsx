"use client";

import { LayoutDashboard, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wordmark } from "@/components/wordmark";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/examples", label: "Examples" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * The signed-in control. A menu rather than a link: the avatar is where people
 * look for "get me out of here", and the dashboard already has its own link
 * beside it.
 *
 * Deliberately the same shape as the sidebar's UserMenu — identity on top,
 * one destructive action under a rule — so the two never teach different
 * habits for the same gesture.
 *
 * `modal={false}` is load-bearing. A modal Radix menu locks body scroll while
 * open, which removes the scrollbar and shifts this fixed header sideways the
 * moment you click it — and an interrupted close can leave the page
 * unscrollable altogether. Nothing here needs a focus trap; it is two items.
 */
function AccountChip({
  name,
  email,
  image,
}: {
  name?: string | null;
  email: string;
  image?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const source = name?.trim() || email;
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="group flex items-center gap-2.5 rounded-xl border border-transparent py-1 pr-3 pl-1 transition-colors hover:border-line hover:bg-s2 data-[state=open]:border-line data-[state=open]:bg-s2"
        >
          {image ? (
            <Image
              src={image}
              alt=""
              width={28}
              height={28}
              // Google 403s the request when a referrer is sent from another origin.
              referrerPolicy="no-referrer"
              className="size-7 rounded-lg object-cover ring-1 ring-line"
            />
          ) : (
            <span className="grid size-7 place-items-center rounded-lg bg-accent font-mono text-[0.625rem] text-[var(--accent-ink)]">
              {initials}
            </span>
          )}
          <span className="hidden text-[0.875rem] text-fg-muted transition-colors group-hover:text-fg sm:block">
            {name?.split(" ")[0] ?? "Account"}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-lg border-line bg-s1"
      >
        <DropdownMenuLabel className="font-normal">
          <span className="grid leading-tight">
            <span className="truncate text-[0.8125rem]">
              {name ?? "Account"}
            </span>
            <span className="truncate font-mono text-[0.6875rem] text-fg-subtle">
              {email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-line" />
        {/* Repeated here because the sibling link is hidden below `sm`. */}
        <DropdownMenuItem asChild className="sm:hidden">
          <Link href="/dashboard">
            <LayoutDashboard />
            Dashboard
          </Link>
        </DropdownMenuItem>
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
  );
}

export function SiteHeader() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [lifted, setLifted] = useState(false);
  const { scrollY } = useScroll();
  const { data: session, isPending } = useSession();

  useMotionValueEvent(scrollY, "change", (y) => setLifted(y > 12));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <motion.div
        initial={false}
        animate={{
          backgroundColor: lifted
            ? "color-mix(in oklab, var(--bg) 78%, transparent)"
            : "color-mix(in oklab, var(--bg) 0%, transparent)",
          borderColor: lifted ? "var(--line)" : "transparent",
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "mx-auto flex h-14 max-w-[72rem] items-center justify-between gap-6 rounded-lg border px-3 sm:px-4",
          lifted && "",
        )}
      >
        <Wordmark className="ml-1" />

        <nav
          className="hidden items-center md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              className="relative px-3.5 py-2 text-[0.875rem] text-fg-muted transition-colors hover:text-fg"
            >
              {hovered === item.href ? (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-lg bg-s2"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <span className="relative">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isPending ? (
            // Reserve the slot rather than flashing signed-out controls at a
            // signed-in visitor while the session resolves.
            <div aria-hidden className="h-9 w-[6.5rem] rounded-xl bg-s2/50" />
          ) : session ? (
            <>
              {/*
                Beside the avatar rather than in the nav: the marketing links
                are for people deciding, this one is for people who already
                did. Hidden on the smallest screens, where the menu carries it.
              */}
              <Link
                href="/dashboard"
                className="hidden rounded-lg px-3 py-2 text-[0.875rem] text-fg-muted transition-colors hover:text-fg sm:block"
              >
                Dashboard
              </Link>
              <AccountChip
                name={session.user.name}
                email={session.user.email}
                image={session.user.image}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-[0.875rem] text-fg-muted transition-colors hover:text-fg sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/pricing"
                className="group relative overflow-hidden rounded-xl bg-fg px-4 py-2 text-[0.875rem] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </header>
  );
}
