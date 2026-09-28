"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A shell command with a copy button. The `$` is drawn, not copied: a prompt
 * pasted into a terminal is a "command not found" before anything has run.
 */
export function CommandBlock({
  command,
  className,
}: {
  command: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if ((await viaClipboardApi(command)) || viaSelection(command)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
    // Neither worked: the text is still on screen to select by hand.
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-line bg-s1 py-2 pr-2 pl-4 text-left font-mono text-[0.875rem]",
        className,
      )}
    >
      <span aria-hidden className="select-none text-fg-faint">
        $
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1.5 text-fg">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${command}`}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-s2 hover:text-fg"
      >
        {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

async function viaClipboardApi(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * The older path, for in-app browsers — Telegram's among them, which is
 * where a link to this page is most likely to be opened — that refuse the
 * Clipboard API but still honour a copy of selected text.
 */
function viaSelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
