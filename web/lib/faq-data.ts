/** FAQ copy — shared by the FAQ section (UI) and the home page (FAQPage schema). */
export const QUESTIONS = [
  {
    q: "Who can read my memories?",
    a: "You, and the model that answers you. Nothing is used for training, nothing is shared, and there's no team dashboard looking over your shoulder. Export whenever you like and you get plain markdown — the same thing the model reads — or JSON if you want every record, superseded and forgotten ones included. No proprietary format between you and your own facts.",
  },
  {
    q: "What happens if I stop paying?",
    a: "Your memory stays put for 90 days and you can export all of it at any point in that window. Nothing is deleted the moment a card fails, and nothing is held hostage to make you resubscribe.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. You add it inside the chat app you already have open, and that's the whole setup — no client, no notification settings to negotiate. Reminders arrive as messages, because that's what they are.",
  },
  {
    q: "How does the expense tracking work?",
    a: "You say what you spent, in the words you'd use anyway — “cucumber 250”, “rickshaw 100”. It picks the category, keeps the running total, and answers when you ask how the month is going. “buy cucumber 250” is understood as the opposite: nothing spent yet, so it goes on your shopping list until you say you bought it. Set a monthly cap by saying it once, and every total is measured against it. The same mechanism tracks anything countable — litres of water, gym visits, weigh-ins — and it works out for itself whether to add them up, count them, or keep only the latest.",
  },
  {
    q: "How is this different from writing myself notes?",
    a: "A note is something you have to remember to go and read. Recalfy reads itself, reconciles things you said months apart, and speaks first when a time you mentioned once actually comes around.",
  },
  {
    q: "Can it get things wrong?",
    a: "It can. When it schedules something it reads the resolved time back before committing, so a misheard “at 5” is caught immediately. And because you can read your whole memory, a wrong answer is something you can see the cause of rather than guess at.",
  },
  {
    q: "Can I run it myself?",
    a: "Yes. Recalfy is open source under the AGPL, and one command — npx recalfy — sets up your own copy on a laptop, a Raspberry Pi or a small server. You paste a Telegram bot token and an AI key, and it works with OpenAI, OpenRouter, Z.ai or a free local model through Ollama. It's free; you look after updates and backups, one command each. The guide is at recalfy.com/self-host.",
  },
  {
    q: "Is there a free trial?",
    a: "Seven days on either plan. Card details are taken when you subscribe so nothing stops when the trial ends, but you aren't charged until it does — and if you do pay, you have fourteen days to ask for it back, no questions asked and no retention call.",
  },
];
