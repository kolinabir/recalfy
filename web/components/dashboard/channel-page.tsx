import { CHANNEL_COPY, ConnectChat } from "@/components/connect-chat";
import { type Channel, channelConfig } from "@/lib/channel-config";
import { getMemories, requireViewer } from "@/lib/dashboard-data";
import { relativeDate } from "@/lib/format";

/**
 * One page, both chats. The only real difference is the last step of the
 * handshake and what "detach" is called in the chat — everything else is the
 * same connection story, and duplicating it would guarantee the two drift.
 */
export async function ChannelPage({ channel }: { channel: Channel }) {
  const viewer = await requireViewer();
  const linked = Boolean(viewer.channels[channel]);
  const { address, configured } = channelConfig(channel);
  const copy = CHANNEL_COPY[channel];

  const memories = linked ? await getMemories(viewer.id) : [];

  return (
    <div>
      <header>
        <p className="eyebrow">{copy.name}</p>
        <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {linked ? "Everything's wired." : "One link left."}
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-fg-muted">
          Recalfy doesn&apos;t live on this page — it lives in your chat with{" "}
          <code className="font-mono text-[0.875rem] text-fg">{address}</code>
          . This page connects the two and then gets out of your way.
        </p>
      </header>

      <div className="mt-8 rounded-xl border border-line bg-s1 p-7 sm:p-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={
              linked
                ? "size-1.5 rounded-full bg-accent"
                : "size-1.5 animate-pulse rounded-full bg-fg-faint/50"
            }
          />
          <span className="eyebrow">
            {linked ? "Connected" : "Not connected"}
          </span>
        </div>

        {linked ? (
          <>
            <p className="mt-4 max-w-prose leading-relaxed text-fg-muted">
              Your {copy.name} account is attached to{" "}
              <span className="text-fg">{viewer.email}</span>
              {memories[0] ? (
                <>
                  {" "}
                  — last memory saved {relativeDate(memories[0].createdAt)}
                </>
              ) : null}
              .
            </p>
            <div className="mt-6 border-t border-line pt-6">
              <h2 className="text-[0.9375rem] font-medium">Detach it</h2>
              <p className="mt-2 max-w-prose text-[0.875rem] leading-relaxed text-fg-subtle">
                Send{" "}
                <code className="rounded border border-line bg-s2 px-1.5 py-0.5 font-mono text-[0.8125rem] text-fg">
                  {channel === "telegram" ? "/unlink" : "unlink"}
                </code>{" "}
                in the chat. Detaching happens where the account can prove
                itself — the same reason connecting does.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 max-w-prose leading-relaxed text-fg-muted">
              You&apos;ll open a chat with the bot and {copy.action}. That
              proves the account is yours — which is why we don&apos;t just ask
              for a username, and why nobody else can claim your memory by
              typing one.
            </p>
            <div className="mt-6">
              {configured ? (
                <ConnectChat channel={channel} address={address} />
              ) : (
                <p className="text-[0.875rem] text-fg-subtle">
                  {copy.name} isn&apos;t switched on yet. It&apos;s coming.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-line px-6 py-5">
        <h2 className="eyebrow">Good to know</h2>
        <ul className="mt-3 grid gap-2.5 text-[0.875rem] leading-relaxed text-fg-subtle">
          <li>
            The bot answers from your memory in the chat — this dashboard is
            the reading room, not the front door.
          </li>
          <li>
            Recalfy will never ask for a pairing code anywhere but the form
            here. Anyone who does is trying to read your memory.
          </li>
        </ul>
      </div>
    </div>
  );
}
