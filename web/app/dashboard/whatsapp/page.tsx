import type { Metadata } from "next";

import { ChannelPage } from "@/components/dashboard/channel-page";

export const metadata: Metadata = {
  title: "WhatsApp",
  description: "The chat your memory lives in.",
};

export default function WhatsAppPage() {
  return <ChannelPage channel="whatsapp" />;
}
