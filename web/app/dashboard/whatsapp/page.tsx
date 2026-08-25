import { redirect } from "next/navigation";

/**
 * Kept as a redirect rather than deleted.
 *
 * WhatsApp is switched off (see AVAILABLE_CHANNELS in lib/channels.ts), but
 * this URL has been in the sidebar, in emails and in browser history. A 404
 * for a page someone reached from their own bookmarks reads as data lost;
 * landing on the chat they actually have reads as a product that moved on.
 */
export default function WhatsAppPage() {
  redirect("/dashboard/telegram");
}
