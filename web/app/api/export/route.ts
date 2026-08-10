import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getArchive,
  getBotProfile,
  getReminders,
  getViewer,
} from "@/lib/dashboard-data";
import {
  buildExport,
  contentType,
  exportFilename,
  isExportFormat,
} from "@/lib/export";

export const runtime = "nodejs";

/**
 * Download the whole memory. `?format=md` is the plain-markdown document the
 * bot recites; `?format=json` is every record it owns.
 *
 * Session-gated like the dashboard pages, and never cached: this is one
 * person's private memory, and a shared cache holding it would be the worst
 * bug in the product.
 */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const requested = request.nextUrl.searchParams.get("format") ?? "md";
  if (!isExportFormat(requested)) {
    return NextResponse.json({ error: "unknown-format" }, { status: 400 });
  }

  const [memories, reminders, profile] = await Promise.all([
    getArchive(viewer.id),
    // 0 is Mongo's "no limit" — an export that stopped at 50 would be a bug
    // nobody notices until the day they need it.
    getReminders(viewer.id, 0),
    getBotProfile(viewer.id),
  ]);

  const exportedAt = new Date();
  const body = buildExport(requested, {
    email: viewer.email,
    timezone: profile.tz ?? "UTC",
    memories,
    reminders,
    exportedAt,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType(requested),
      "Content-Disposition": `attachment; filename="${exportFilename(requested, exportedAt)}"`,
      "Cache-Control": "no-store, private",
    },
  });
}
