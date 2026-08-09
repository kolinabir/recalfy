import { DateTime } from 'luxon';

/**
 * The regression suite for the prompt.
 *
 * Each case is a fresh scratch user talked to through the real Brain and the
 * real model. Expectations are about *tool calls* — the things that must
 * happen, not the wording of the reply — because the wording is allowed to
 * vary and the actions are not.
 */
export interface EvalCase {
  name: string;
  /** Zone to onboard the scratch user into before talking. */
  timezone?: string;
  /** Facts taught through the real store before the conversation starts. */
  seedFacts?: { text: string; group?: string }[];
  /** Raw transcript rows inserted before the conversation starts. */
  seedMessages?: string[];
  turns: EvalTurn[];
}

export interface EvalTurn {
  say: string;
  /** Every entry must match some tool call made during this turn. */
  expect?: ExpectedCall[];
  /** Tools that must NOT be called during this turn. */
  forbid?: string[];
  /** The reply itself, when its shape is part of the contract. */
  replyMatch?: RegExp;
}

export interface ExpectedCall {
  tool: string;
  /** Extra scrutiny on the arguments. Receives JSON-parsed args. */
  check?: (args: Record<string, unknown>) => boolean;
  /** How the check reads in the report. */
  label?: string;
}

const DHAKA = 'Asia/Dhaka';

/** Tomorrow 18:00 in the seeded zone, for cases that need a nearby instant. */
function tomorrowEvening(): string {
  return DateTime.now().setZone(DHAKA).plus({ days: 1 }).set({ hour: 18, minute: 0 }).toISO()!;
}

function facts(args: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(args.facts) ? (args.facts as Record<string, unknown>[]) : [];
}

export const CASES: EvalCase[] = [
  {
    name: 'plain fact → remember',
    timezone: DHAKA,
    turns: [
      {
        say: 'my landlord is called Rahim',
        expect: [
          {
            tool: 'remember',
            check: (args) => facts(args).some((f) => String(f.text).includes('Rahim')),
            label: 'stores a fact naming Rahim',
          },
        ],
      },
    ],
  },
  {
    name: 'correction → remember with supersedes',
    timezone: DHAKA,
    seedFacts: [{ text: 'Rent is due on the 5th.', group: 'Home' }],
    turns: [
      {
        say: 'actually rent moved to the 3rd',
        expect: [
          {
            tool: 'remember',
            check: (args) =>
              facts(args).some((f) => Array.isArray(f.supersedes) && f.supersedes.length > 0),
            label: 'cites the old fact in supersedes',
          },
        ],
      },
    ],
  },
  {
    name: 'one-off reminder → remind without repeat',
    timezone: DHAKA,
    turns: [
      {
        say: 'remind me to call mum tomorrow at 6pm',
        expect: [
          {
            tool: 'remind',
            check: (args) => args.repeat === undefined,
            label: 'no repeat on a one-off',
          },
        ],
      },
    ],
  },
  {
    name: '"every Monday" → weekly recurrence',
    timezone: DHAKA,
    turns: [
      {
        say: 'remind me to water the plants every monday at 9am',
        expect: [
          {
            tool: 'remind',
            check: (args) => args.repeat === 'week',
            label: 'repeat=week',
          },
        ],
      },
    ],
  },
  {
    name: '"3rd of every month" → monthly recurrence',
    timezone: DHAKA,
    turns: [
      {
        say: 'remind me to pay rent on the 3rd of every month at 10am',
        expect: [
          {
            tool: 'remind',
            check: (args) => args.repeat === 'month',
            label: 'repeat=month',
          },
        ],
      },
    ],
  },
  {
    name: 'lead-time → event_at + lead_days, no self-arithmetic',
    timezone: DHAKA,
    turns: [
      {
        say: `my lease renews on ${tomorrowEvening().slice(0, 10)} at 6pm — remind me 2 days before... actually make that next month, the 25th at 6pm, remind me 2 days before`,
        expect: [
          {
            tool: 'remind',
            check: (args) => args.lead_days === 2 && typeof args.event_at === 'string',
            label: 'passes event_at and lead_days=2',
          },
        ],
      },
    ],
  },
  {
    name: 'temporary fact → expires date',
    timezone: DHAKA,
    turns: [
      {
        say: "i'm visiting my parents next week, back next sunday",
        expect: [
          {
            tool: 'remember',
            check: (args) => facts(args).some((f) => typeof f.expires === 'string'),
            label: 'sets an expires date',
          },
        ],
      },
    ],
  },
  {
    name: 'birthday → remembered and a yearly reminder offered',
    timezone: DHAKA,
    turns: [
      {
        say: "my mum's birthday is on March 12",
        expect: [{ tool: 'remember' }],
        replyMatch: /remind/i,
      },
    ],
  },
  {
    name: 'forget request → forget',
    timezone: DHAKA,
    seedFacts: [{ text: "User's favourite colour is blue." }],
    turns: [
      {
        say: 'forget what i told you about my favourite colour',
        expect: [{ tool: 'forget' }],
      },
    ],
  },
  {
    name: 'question about old conversation → search_history',
    timezone: DHAKA,
    seedMessages: [
      'the geyser in the bathroom is making a weird rattling noise',
      ...Array.from({ length: 12 }, (_, i) => `filler chat message number ${i + 1}`),
    ],
    turns: [
      {
        say: 'what did I say about the geyser?',
        expect: [{ tool: 'search_history' }],
      },
    ],
  },
  {
    name: 'doubted fact → recall_source',
    timezone: DHAKA,
    seedFacts: [{ text: 'Landlord is Rahim.', group: 'People' }],
    turns: [
      {
        say: 'when did i tell you my landlord was called rahim?',
        expect: [{ tool: 'recall_source' }],
      },
    ],
  },
  {
    name: 'goal → remembered under Goals',
    timezone: DHAKA,
    turns: [
      {
        say: 'i want to start going to the gym three times a week',
        expect: [
          {
            tool: 'remember',
            check: (args) => facts(args).some((f) => String(f.group ?? '').toLowerCase() === 'goals'),
            label: 'group=Goals',
          },
        ],
      },
    ],
  },
  {
    name: '"stop the morning messages" → brief off',
    timezone: DHAKA,
    turns: [
      {
        say: 'please stop the morning messages',
        expect: [
          {
            tool: 'set_daily_brief',
            check: (args) => args.enabled === false,
            label: 'enabled=false',
          },
        ],
      },
    ],
  },
  {
    name: 'small talk → no tools fired',
    timezone: DHAKA,
    turns: [
      {
        say: 'haha yeah the weather is really nice today',
        forbid: ['remember', 'remind', 'forget'],
      },
    ],
  },
];
