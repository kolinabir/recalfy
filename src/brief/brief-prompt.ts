import { DateTime } from 'luxon';

/** The model's way of saying "nothing worth sending today". Checked verbatim. */
export const SKIP = 'SKIP';

export interface BriefPromptInput {
  /** The rendered memory document from MemoryStore. */
  memory: string;
  /** Today's reminders, already described in the user's zone. Empty is fine. */
  reminders: string[];
  /** The last few days of conversation, oldest first, as "user:"/"assistant:" lines. */
  conversation: string[];
  timezone: string;
  now: Date;
  /** Sundays: fold a short week-in-review over the Goals into the brief. */
  weekReview: boolean;
}

/**
 * The prompt behind the morning brief. One completion, no tools.
 *
 * The bar to clear is written into the prompt itself: a brief with nothing in
 * it must come back as SKIP, because a daily "no reminders today!" trains the
 * user to ignore the one message that matters.
 */
export function buildBriefPrompt(input: BriefPromptInput): string {
  const local = DateTime.fromJSDate(input.now, { zone: input.timezone });

  return [
    `You are the user's memory, living in a Telegram chat. It is morning:
${local.toFormat('EEEE d LLLL yyyy, h:mm a')} (${input.timezone}). Write today's
brief — a short, warm good-morning message. Plain chat text, no markdown, no
headings, at most four short sentences.`,

    `What you know about the user:\n\n${input.memory}`,

    input.reminders.length > 0
      ? `Reminders that will fire today (they will also arrive on time — mention them in passing, in plain words):\n${input.reminders.map((line) => `- ${line}`).join('\n')}`
      : 'No reminders are set for today.',

    input.conversation.length > 0
      ? `The recent conversation, oldest first:\n${input.conversation.map((line) => `- ${line}`).join('\n')}`
      : 'There has been no recent conversation.',

    `Compose the brief from whichever of these actually deserves words today:
- today's reminders, woven in naturally ("your rent is due today")
- at most ONE gentle follow-up on an open loop from the memory or the recent
  conversation — something they said they would do, were worried about, or
  left unresolved ("did the plumber ever come?"). Never more than one.
- a date in the memory that is today or imminent (a birthday, a deadline)

Do not invent content to fill space. No generic greetings-plus-nothing, no
weather talk, no motivational filler. If there are no reminders today and no
follow-up genuinely worth asking, reply with exactly ${SKIP} and nothing else.`,

    ...(input.weekReview
      ? [
          `It is Sunday. If the memory lists anything under Goals, add one or two
sentences of week-in-review: for each goal, what the recent conversation
suggests actually happened this week — encouraging when there is progress,
gently honest when there is silence, never scolding. A week-review with
goals to report on makes the brief worth sending even with nothing else.`,
        ]
      : []),
  ].join('\n\n');
}

export interface ReflectionPromptInput {
  /** The rendered memory document from MemoryStore. */
  memory: string;
  /** Only today's messages, oldest first, as "user:"/"assistant:" lines. */
  today: string[];
  timezone: string;
  now: Date;
}

/**
 * The evening mirror of the brief: look back at today, and invite the user
 * to bank anything worth keeping. The reply flows back through the normal
 * remember/forget path, so answering it literally improves the memory.
 */
export function buildReflectionPrompt(input: ReflectionPromptInput): string {
  const local = DateTime.fromJSDate(input.now, { zone: input.timezone });

  return [
    `You are the user's memory, living in a Telegram chat. It is evening:
${local.toFormat('EEEE d LLLL yyyy, h:mm a')} (${input.timezone}). Write a short
end-of-day note — plain chat text, no markdown, at most three short sentences.`,

    `What you know about the user:\n\n${input.memory}`,

    `Today's conversation, oldest first:\n${input.today.map((line) => `- ${line}`).join('\n')}`,

    `The note should do at most two things:
- touch ONE meaningful thread from today — something decided, worried over,
  or left hanging — in a warm, closing-the-day tone
- ask once, lightly, if there is anything from today worth keeping in mind

Do not summarise the whole day back at them, and never sound like a survey.
If today's conversation was only small talk, or the day already ended with a
natural close, reply with exactly ${SKIP} and nothing else.`,
  ].join('\n\n');
}
