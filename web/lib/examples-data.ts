/**
 * The catalogue of what Recalfy actually does, shown rather than described.
 *
 * Every entry is a real pair: the thing you'd type in passing, and what comes
 * back later. The `when` line carries the time gap, which is the whole point —
 * anything can remember for five minutes.
 */

export type Example = {
  said: string;
  when: string;
  back: string;
};

export type ExampleGroup = {
  id: string;
  title: string;
  blurb: string;
  examples: Example[];
};

export const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    id: "dates",
    title: "Dates and plans",
    blurb:
      "Anything with a time attached. You mention it once, in whatever words you'd use out loud, and it holds the date without you filing it anywhere.",
    examples: [
      {
        said: "mot's due end of march",
        when: "mid-March",
        back: "MOT is due this month — book it before the 31st.",
      },
      {
        said: "school run swaps to 3:15 after half term",
        when: "the Monday back",
        back: "Pickup is 3:15 from today, not 3:40.",
      },
      {
        said: "nadia's viva is the 12th",
        when: "the evening of the 11th",
        back: "Nadia's viva is tomorrow — worth a message tonight.",
      },
      {
        said: "bin day moved to wednesday on our street",
        when: "Tuesday night",
        back: "Bins go out tonight — it's Wednesday collection now.",
      },
      {
        said: "passport expires feb 2027",
        when: "booking a trip, Aug 2026",
        back: "Passport expires Feb 2027 — some countries want six months on it.",
      },
      {
        said: "trial period ends after 30 days, started the 4th",
        when: "the 2nd",
        back: "Trial ends in two days — cancel by the 4th if you're not keeping it.",
      },
      {
        said: "sam's leaving drinks thursday at the anchor",
        when: "Thursday, late afternoon",
        back: "Sam's leaving drinks tonight, the Anchor.",
      },
      {
        said: "rent goes out on the 1st now, not the 28th",
        when: "end of month",
        back: "Rent leaves on the 1st now — the 28th date is dead.",
      },
      {
        said: "dentist said come back in six months",
        when: "five months on",
        back: "Dentist recall is about due — six months was from March.",
      },
    ],
  },
  {
    id: "people",
    title: "People",
    blurb:
      "The small things about people that make you good to be around, and that nobody can hold for two hundred people at once.",
    examples: [
      {
        said: "tom's gone vegetarian",
        when: "planning dinner, months later",
        back: "Tom's vegetarian now — has been since the spring.",
      },
      {
        said: "leila's mum has been ill",
        when: "before you next call her",
        back: "Ask after Leila's mum — she was ill when you last spoke.",
      },
      {
        said: "priya's kid is allergic to shellfish",
        when: "booking the restaurant",
        back: "No shellfish place — Priya's kid is allergic.",
      },
      {
        said: "my manager hates being cc'd on everything",
        when: "drafting the update",
        back: "Don't cc your manager — she'd rather get the summary.",
      },
      {
        said: "ben and ayesha split up, don't bring it up",
        when: "before the group dinner",
        back: "Ben and Ayesha split — leave it unless he raises it.",
      },
      {
        said: "james prefers james, not jim",
        when: "writing to him",
        back: "James, not Jim.",
      },
      {
        said: "dad's been eyeing an opinel no. 8",
        when: "December, gift hunting",
        back: "Dad: the Opinel No. 8 he kept picking up in Lisbon.",
      },
      {
        said: "the new client's based in melbourne",
        when: "scheduling a call",
        back: "She's in Melbourne — your 9am is her 8pm.",
      },
      {
        said: "hana's baby is due in september",
        when: "late August",
        back: "Hana's due next month — good time to send something.",
      },
      {
        said: "carlos doesn't drink",
        when: "picking a venue",
        back: "Carlos doesn't drink — somewhere that isn't just a bar.",
      },
    ],
  },
  {
    id: "places",
    title: "Places and things",
    blurb:
      "Where you put it, where you parked, which one you liked. The category of fact that is worthless for a year and then urgent for thirty seconds.",
    examples: [
      {
        said: "spare key's under the third pot",
        when: "locked out, a year on",
        back: "Third pot along.",
      },
      {
        said: "parked level 3, row f, near the lift",
        when: "back from the flight",
        back: "Level 3, row F — by the lift.",
      },
      {
        said: "the good pharmacy is the one past the roundabout",
        when: "next time you need it",
        back: "Past the roundabout, not the one on the high street.",
      },
      {
        said: "put the winter duvet in the loft, left side",
        when: "October",
        back: "Loft, left side.",
      },
      {
        said: "tonight's rioja was great, muga something?",
        when: "at the wine shop",
        back: "Muga Reserva. You liked it on 14 March.",
      },
      {
        said: "the tiles are farrow ball 'skimming stone'",
        when: "touching up the paint",
        back: "Skimming Stone, Farrow & Ball.",
      },
      {
        said: "bike's in the shed, back left, behind the mower",
        when: "first warm weekend",
        back: "Shed, back left, behind the mower.",
      },
      {
        said: "we sat upstairs at that place on the corner, it was lovely",
        when: "booking again",
        back: "The corner place — you sat upstairs and liked it.",
      },
      {
        said: "boiler pressure should sit at 1.5",
        when: "next winter, when it cuts out",
        back: "1.5 bar — top it up until the needle's there.",
      },
    ],
  },
  {
    id: "details",
    title: "Numbers, codes and details",
    blurb:
      "The strings you're told once and expected to have forever. Say them in the chat and they're findable in a sentence, not a password manager you never set up.",
    examples: [
      {
        said: "cabin wifi is bluepine2024",
        when: "next summer",
        back: "bluepine2024",
      },
      {
        said: "hotel safe code is 8812",
        when: "checkout morning",
        back: "8812",
      },
      {
        said: "meter reading today is 44120",
        when: "the next bill",
        back: "Last reading was 44120, on 3 May.",
      },
      {
        said: "my policy number is BH-4471-K",
        when: "on the phone to them",
        back: "BH-4471-K",
      },
      {
        said: "the gate code changed to 2244",
        when: "arriving late",
        back: "2244 — changed from 1180 in June.",
      },
      {
        said: "plumber's quote was 40k, valid 30 days",
        when: "comparing quotes",
        back: "His was 40k, quoted 12 April — that's expired now.",
      },
      {
        said: "shoe size for the kids: 11 and 13",
        when: "buying school shoes",
        back: "11 and 13 — that was in January, so check.",
      },
      {
        said: "bin store key is the small brass one",
        when: "handing keys to a guest",
        back: "Small brass one.",
      },
      {
        said: "flight ref is QK7P2M",
        when: "at the desk",
        back: "QK7P2M",
      },
    ],
  },
  {
    id: "money",
    title: "Money",
    blurb:
      "Say what you spent the way you'd say it out loud. No categories to set up, no receipts to photograph, no Sunday spent reconciling.",
    examples: [
      {
        said: "coffee 180",
        when: "instantly",
        back: "180, food.",
      },
      {
        said: "keep me under 15000 a month",
        when: "every total after that",
        back: "4,250 of 15,000 — 28% used, 19 days to go.",
      },
      {
        said: "how much on eating out this month?",
        when: "instantly",
        back: "2,180 across 9 meals — about a third of your spending.",
      },
      {
        said: "petrol 3200",
        when: "instantly",
        back: "3,200, transport.",
      },
      {
        said: "what did I spend last month vs this one?",
        when: "instantly",
        back: "12,940 last month, 8,700 so far this — you're tracking lower.",
      },
      {
        said: "paid the window guy 5k cash",
        when: "instantly",
        back: "5,000, home. Cash noted.",
      },
      {
        said: "am I going to make it to payday?",
        when: "instantly",
        back: "10,410 left over 19 days — about 550 a day. You're fine at your usual rate.",
      },
      {
        said: "that 3200 was diesel not petrol",
        when: "instantly",
        back: "Updated — same entry, still 3,200.",
      },
      {
        said: "how much have I spent on the car this year?",
        when: "instantly",
        back: "48,600 — servicing, tyres, and the two fuel months you logged.",
      },
    ],
  },
  {
    id: "lists",
    title: "Lists and errands",
    blurb:
      "A shopping list is not a ledger. One word decides which you meant, and the moment you buy the thing, the list item becomes the expense — one record, not two.",
    examples: [
      {
        said: "buy cucumber 250",
        when: "instantly",
        back: "Cucumber, about 250 — on your list. Nothing spent yet.",
      },
      {
        said: "got the cucumber, 260",
        when: "instantly",
        back: "Marked bought — 260 on groceries. Same entry.",
      },
      {
        said: "add batteries and bin bags",
        when: "instantly",
        back: "Both on the list.",
      },
      {
        said: "what's on my list?",
        when: "at the shop",
        back: "Batteries, bin bags, and the cucumber from Tuesday.",
      },
      {
        said: "need to ring the council about the tax band",
        when: "a weekday morning",
        back: "Ring the council — council tax band.",
      },
      {
        said: "drop the parcel at the post office",
        when: "when you're next out",
        back: "Parcel for the post office — still open.",
      },
      {
        said: "take the bin bags off, got them already",
        when: "instantly",
        back: "Off the list.",
      },
      {
        said: "what's still outstanding?",
        when: "Sunday night",
        back: "Two things: the council call, and the parcel.",
      },
    ],
  },
  {
    id: "trackers",
    title: "Habits and trackers",
    blurb:
      "Say what you want watched and it works out whether the thing should be summed, counted, or simply read off the latest number. No dashboard to configure.",
    examples: [
      {
        said: "track my water, 3L a day",
        when: "set up, in one line",
        back: "Tracking water — 3L a day.",
      },
      {
        said: "500ml",
        when: "instantly",
        back: "1.5 of 3L today.",
      },
      {
        said: "weighed in at 78.4",
        when: "instantly",
        back: "78.4 — down 1.1 since you started in April.",
      },
      {
        said: "went to the gym",
        when: "instantly",
        back: "That's 3 this week, 11 this month.",
      },
      {
        said: "read 40 pages",
        when: "instantly",
        back: "620 pages this month.",
      },
      {
        said: "how's my water been this week?",
        when: "instantly",
        back: "You hit 3L on four days, missed Tuesday and Thursday.",
      },
      {
        said: "track how often I skip breakfast",
        when: "set up, in one line",
        back: "Counting it — tell me each time.",
      },
      {
        said: "am I doing better than last month on the gym?",
        when: "instantly",
        back: "11 so far against 8 all of last month, and there's a week left.",
      },
    ],
  },
  {
    id: "reminders",
    title: "Reminders that arrive on their own",
    blurb:
      "It messages you first, at the time you mentioned once. Times resolve in your timezone and get read back before anything is set, so a misheard hour is caught while you can still fix it.",
    examples: [
      {
        said: "remind me sunday morning to book her a class",
        when: "Sunday, 9:00",
        back: "⏰ Book Sara a ceramics class — her birthday's Tuesday.",
      },
      {
        said: "nudge me an hour before the call",
        when: "an hour before",
        back: "⏰ Client call at 4 — an hour out.",
      },
      {
        said: "remind me to take the bins out every tuesday night",
        when: "every Tuesday, 21:00",
        back: "⏰ Bins out.",
      },
      {
        said: "tell me to stretch every day at 6",
        when: "daily, 18:00",
        back: "⏰ Stretch.",
      },
      {
        said: "remind me the night before to print the boarding pass",
        when: "the 14th, 20:00",
        back: "⏰ Print the boarding pass — flight's 06:00.",
      },
      {
        said: "remind me at 5 tomorrow",
        when: "immediately, to confirm",
        back: "Tomorrow, 5:00 PM your time — say if you meant the morning.",
      },
      {
        said: "in three weeks, chase the deposit",
        when: "three weeks on",
        back: "⏰ Chase the deposit — you flagged this on 2 May.",
      },
      {
        said: "cancel the stretching reminder",
        when: "instantly",
        back: "Gone. The Tuesday bins one is still on.",
      },
    ],
  },
  {
    id: "corrections",
    title: "Corrections and forgetting",
    blurb:
      "A correction retires the old fact instead of stacking on top of it. Nothing in your memory contradicts anything else in it — and anything you want gone is gone, exactly.",
    examples: [
      {
        said: "the flight got pushed a day",
        when: "instantly",
        back: "Moved to the 15th — the 14th is retired.",
      },
      {
        said: "actually she's allergic to almonds not walnuts",
        when: "instantly",
        back: "Corrected. The walnut version is gone.",
      },
      {
        said: "forget the landlord's number, he changed it",
        when: "instantly",
        back: "Gone — that one record, nothing else.",
      },
      {
        said: "forget everything about the old flat",
        when: "instantly",
        back: "Removed 6 records — address, gate code, meter, landlord, bin day, wifi.",
      },
      {
        said: "no, the dentist is friday not tuesday",
        when: "instantly",
        back: "Moved — Tuesday's slot is gone.",
      },
      {
        said: "I don't work fridays anymore",
        when: "any Friday question after",
        back: "You don't work Fridays — that changed in June.",
      },
      {
        said: "what do you actually know about me?",
        when: "instantly",
        back: "48 things. Here they are, grouped — read it, edit it, or export the lot.",
      },
    ],
  },
  {
    id: "asking",
    title: "Asking it things back",
    blurb:
      "There's no search box, and no search either. Your whole memory goes to the model on every message, so a question spanning four unrelated facts comes back with all four.",
    examples: [
      {
        said: "what's coming up this week?",
        when: "instantly",
        back: "Dentist Friday 11:00, Sam's drinks Thursday, and the MOT before the 31st.",
      },
      {
        said: "anything I should know before priya comes over?",
        when: "instantly",
        back: "Her kid can't have shellfish — you told me that in March.",
      },
      {
        said: "what did I say about the boiler?",
        when: "instantly",
        back: "Pressure sits at 1.5, service due in March, and the quote was 40k.",
      },
      {
        said: "who was that plumber I liked?",
        when: "instantly",
        back: "The one your neighbour recommended — you said he was quick and cheap.",
      },
      {
        said: "when's my cleaning again?",
        when: "instantly",
        back: "Friday, 11:00 — moved from Tuesday last week.",
      },
      {
        said: "have I bought dad a present yet?",
        when: "instantly",
        back: "No. You noted the Opinel No. 8 in Lisbon, but nothing's been logged as bought.",
      },
      {
        said: "what do I need for the trip?",
        when: "instantly",
        back: "Boarding pass to print, the spare SIM in your desk drawer, and passport's fine until 2027.",
      },
      {
        said: "did I ever pay the window guy?",
        when: "instantly",
        back: "Yes — 5,000 cash, 12 April.",
      },
    ],
  },
];

export const EXAMPLE_COUNT = EXAMPLE_GROUPS.reduce(
  (total, group) => total + group.examples.length,
  0,
);
