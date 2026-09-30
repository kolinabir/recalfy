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
  {
    name: 'tracking: bare item + amount → expense, spent',
    timezone: DHAKA,
    turns: [
      {
        say: 'cucumber 250',
        expect: [
          {
            tool: 'track',
            check: (args) =>
              entries(args).some((e) => e.value === 250 && e.planned !== true),
            label: 'value=250, not planned',
          },
        ],
        forbid: ['remember', 'remind'],
      },
    ],
  },
  {
    name: 'tracking: "buy X" → shopping list, then bought → update_entry',
    timezone: DHAKA,
    turns: [
      {
        say: 'buy cucumber, should be around 250',
        expect: [
          {
            tool: 'track',
            check: (args) => entries(args).some((e) => e.planned === true),
            label: 'planned=true',
          },
        ],
        forbid: ['remind'],
      },
      {
        say: 'got the cucumber just now',
        expect: [
          {
            tool: 'update_entry',
            check: (args) => args.bought === true,
            label: 'bought=true, not a second entry',
          },
        ],
        forbid: ['track'],
      },
    ],
  },
  {
    name: 'tracking: price arrives only at purchase',
    timezone: DHAKA,
    turns: [
      {
        say: 'need to grab milk',
        expect: [
          {
            tool: 'track',
            check: (args) => entries(args).some((e) => e.planned === true),
            label: 'planned=true',
          },
        ],
      },
      {
        say: 'got the milk, it was 80',
        expect: [
          {
            tool: 'update_entry',
            check: (args) => args.bought === true && args.value === 80,
            label: 'bought=true with the real price',
          },
        ],
        forbid: ['track'],
      },
    ],
  },
  {
    name: 'tracking: correction cites the entry',
    timezone: DHAKA,
    turns: [
      { say: 'rickshaw 100' },
      {
        say: 'oh wait, it was actually 150',
        expect: [
          {
            tool: 'update_entry',
            check: (args) => args.value === 150,
            label: 'value corrected to 150',
          },
        ],
        forbid: ['track'],
      },
    ],
  },
  {
    name: 'tracking: "track my water, 3L a day" → configure_tracker',
    timezone: DHAKA,
    turns: [
      {
        say: 'can you track my water intake? i want to drink 3 liters a day',
        expect: [
          {
            tool: 'configure_tracker',
            check: (args) => String(args.name ?? '').toLowerCase().includes('water'),
            label: 'a water tracker with a goal',
          },
        ],
      },
    ],
  },
  {
    name: 'tracking: a durable amount is a fact, not an expense',
    timezone: DHAKA,
    turns: [
      {
        say: 'my rent is 15000 by the way',
        expect: [{ tool: 'remember' }],
        forbid: ['track'],
      },
    ],
  },
  {
    name: 'tracking: "how much this month" answered from the digest',
    timezone: DHAKA,
    turns: [
      { say: 'lunch 350' },
      {
        say: 'how much have I spent this month?',
        replyMatch: /350/,
        forbid: ['track'],
      },
    ],
  },
  {
    name: 'tracking: the total is not double-counted against the itemised list',
    timezone: DHAKA,
    turns: [
      { say: 'cucumber 250' },
      { say: 'rickshaw 100' },
      {
        say: 'how much have I spent this month?',
        // The bug this pins: the digest lists recent entries under the total,
        // and the model summed both — reporting 700 for 350 of spending.
        replyMatch: /350/,
      },
      {
        say: 'and what was the breakdown?',
        replyMatch: /250[\s\S]*100|100[\s\S]*250/,
      },
    ],
  },
  {
    name: 'tracking: a day summary stays plain text, no markdown',
    timezone: DHAKA,
    turns: [
      { say: 'rice 900' },
      { say: 'electric bill 1200' },
      {
        say: 'tell me about today',
        // Telegram gets no parse_mode, so asterisks would render literally.
        replyMatch: /^(?!.*\*\*)[\s\S]*$/,
      },
    ],
  },
  {
    name: 'tracking: last month needs the report tool',
    timezone: DHAKA,
    turns: [
      {
        say: 'how much did i spend last month?',
        expect: [{ tool: 'report' }],
      },
    ],
  },
  {
    name: 'tracking: buying at a future time is a reminder, not a list line',
    timezone: DHAKA,
    turns: [
      {
        say: 'i need to buy milk tomorrow evening on the way home',
        expect: [{ tool: 'remind' }],
      },
    ],
  },
];

/**
 * Enough ordinary facts to push a memory past FULL_LIMIT, so the fact under
 * test (seeded first, so oldest) is left out of the prompt and only
 * `search_memory` can reach it. Varied on purpose: a search that matched
 * everything would pass for the wrong reason.
 */
function filler(count = 400): { text: string; group: string }[] {
  const names = ['Sara', 'Tanvir', 'Nadia', 'Arif', 'Mitu', 'Omar', 'Lena', 'Joy', 'Fahim', 'Anika'];
  const make: [string, (i: number, n: string) => string][] = [
    ['People', (i, n) => `${n} ${i}'s birthday is on ${1 + (i % 28)} March.`],
    ['People', (i, n) => `${n} ${i} works at a design studio in Banani.`],
    ['Work', (i) => `Project ${i} is due on ${1 + (i % 28)} November.`],
    ['Preferences', (i) => `Likes table ${i} at the corner café.`],
    ['Places', (i) => `Favourite biryani place is on Road ${i}, Mirpur.`],
    ['Health', (i) => `Walked ${2000 + i} steps on day ${i}.`],
    ['Home', (i) => `Box ${i} in the storeroom holds winter clothes.`],
  ];
  return Array.from({ length: count }, (_, i) => {
    const [group, text] = make[i % make.length];
    return { group, text: text(i, names[i % names.length]) };
  });
}

/** The fact under test is seeded first, so it is the oldest — `01`. */
const OLDEST = '01';

export const LARGE_MEMORY_CASES: EvalCase[] = [
  {
    name: 'large memory: an unlisted fact is found by search',
    timezone: DHAKA,
    seedFacts: [{ text: "Kolin's dentist is Dr. Karim in Gulshan.", group: 'Health' }, ...filler()],
    turns: [
      {
        say: "who's my dentist again?",
        expect: [{ tool: 'search_memory' }],
        replyMatch: /Karim/,
      },
    ],
  },
  {
    name: 'large memory: correcting an unlisted fact supersedes it',
    timezone: DHAKA,
    seedFacts: [{ text: 'Rent is due on the 5th of each month.', group: 'Home' }, ...filler()],
    turns: [
      {
        say: 'actually rent moved to the 3rd',
        expect: [
          { tool: 'search_memory' },
          {
            tool: 'remember',
            check: (args) =>
              facts(args).some((f) => Array.isArray(f.supersedes) && f.supersedes.includes(OLDEST)),
            label: 'supersedes the unlisted fact by its id',
          },
        ],
      },
    ],
  },
  {
    name: 'large memory: forgetting an unlisted fact',
    timezone: DHAKA,
    seedFacts: [
      { text: 'Kolin used to play cricket for the Dhanmondi club.', group: 'Personal' },
      ...filler(),
    ],
    turns: [
      {
        say: 'forget the thing about me playing cricket',
        expect: [
          {
            tool: 'forget',
            check: (args) => Array.isArray(args.ids) && args.ids.includes(OLDEST),
            label: 'deletes the unlisted fact by its id',
          },
        ],
      },
    ],
  },
  {
    name: 'large memory: a listed fact needs no search',
    timezone: DHAKA,
    seedFacts: [...filler(), { text: 'Kolin parks on level B2.', group: 'Places' }],
    turns: [
      {
        say: 'where do i park?',
        forbid: ['search_memory'],
        replyMatch: /B2/,
      },
    ],
  },
];

export const VAULT_CASES: EvalCase[] = [
  {
    name: 'vault: a password is stored as given',
    timezone: DHAKA,
    turns: [
      {
        say: 'the office wifi password is Sunflower#88',
        expect: [
          {
            tool: 'remember',
            check: (args) => facts(args).some((f) => String(f.text).includes('Sunflower#88')),
            label: 'stores the value verbatim',
          },
        ],
      },
    ],
  },
  {
    name: 'vault: asking for a hidden password reveals it',
    timezone: DHAKA,
    seedFacts: [{ text: 'The office wifi password is Sunflower#88.', group: 'Work' }],
    turns: [
      {
        say: "what's the office wifi password?",
        expect: [{ tool: 'reveal_secret' }],
        // It cannot see the value, so it must not claim one.
        replyMatch: /^(?![\s\S]*Sunflower)/,
      },
    ],
  },
];

function entries(args: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(args.entries) ? (args.entries as Record<string, unknown>[]) : [];
}
