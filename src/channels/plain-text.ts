/**
 * Strips markdown the model emitted despite being told not to.
 *
 * Messages are sent without a `parse_mode`, so Telegram and WhatsApp show
 * `**bold**` with the asterisks intact — the model reaching for a heading
 * turns a warm reply into something that reads like a leaked template. The
 * prompt already forbids it; this is the guarantee, because a rule the model
 * follows most of the time is not a guarantee at all.
 *
 * Deliberately narrow. It removes the markers that render as literal noise
 * and leaves everything else — including apostrophes, maths, and prices —
 * exactly as written.
 */
export function toPlainText(text: string): string {
  return (
    text
      // ### Heading → Heading
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      // > quote → quote
      .replace(/^\s{0,3}>\s?/gm, '')
      // **bold**, __bold__, ***both*** → the word itself.
      .replace(/(\*{2,3}|_{2})(?=\S)([\s\S]*?\S)\1/g, '$2')
      // *italic* → italic, but never a bullet ("* milk") or a bare asterisk.
      .replace(/(?<![\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, '$1')
      // `code` → code. Fences go first so their language tag doesn't survive.
      .replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      // [label](url) → label (url), so a shared link is still usable.
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1 ($2)')
      // A markdown bullet becomes the typographic one chat apps expect.
      .replace(/^(\s*)[*+-]\s+/gm, '$1• ')
      // --- rules leave a blank line behind rather than a row of dashes.
      .replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, '')
      // Collapse the gaps any of the above may have opened up.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
