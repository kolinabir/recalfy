import { UserDoc } from '../mongo/collections';

/**
 * Whether this turn has any reason to touch the tabs.
 *
 * The mirror gates itself too, but it costs three reads to find out — and the
 * overwhelming majority of turns are from people who have never switched this
 * on. Everything needed to answer is already in hand by the time a reply has
 * been sent, so the question is worth asking here first.
 *
 * The two cases that are not "memory changed":
 *
 * - **On, but never built.** The switch is on the dashboard and the bot is not
 *   watching it. Without this, someone flips it and nothing happens until they
 *   next tell the bot a fact — which reads as the switch being broken.
 * - **Off, but built.** Same problem from the other side: switching it off has
 *   to take the tabs away, and this is the next moment we hear from them.
 */
export function needsTopicSync(
  user: Pick<UserDoc, 'topics' | 'topicIndex'>,
  memoryChanged: boolean,
): boolean {
  if (user.topics === true) return memoryChanged || user.topicIndex === undefined;
  return user.topicIndex !== undefined;
}
