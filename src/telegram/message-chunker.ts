/** Telegram rejects messages over 4096 characters; a rendered memory will pass that. */
const MAX_MESSAGE_LENGTH = 4000;

/** Splits on the last newline that fits, so markdown structure survives the cut. */
export function chunkMessage(text: string, limit: number = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    const splitAt = chooseSplitPoint(remaining, limit);
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n/, '');
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/** Prefers a line break, but only if it isn't so early that it wastes a message. */
function chooseSplitPoint(text: string, limit: number): number {
  const lastNewline = text.lastIndexOf('\n', limit);
  return lastNewline > limit / 2 ? lastNewline : limit;
}
