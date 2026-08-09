import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardView } from "@/components/dashboard-view";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Recalfy account.",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Proxy already turned away anyone without a cookie; this catches a cookie
  // that is present but no longer valid.
  if (!session) redirect("/login");

  // Written by the bot when it redeems a link token, so it is authoritative
  // here — the client never gets to assert it.
  const telegramUserId = (session.user as { telegramUserId?: number })
    .telegramUserId;

  return (
    <DashboardView
      email={session.user.email}
      name={session.user.name}
      linked={typeof telegramUserId === "number"}
    />
  );
}
