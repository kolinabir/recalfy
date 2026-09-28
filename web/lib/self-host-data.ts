/**
 * Self-hosting, as data — shared by /self-host, the home page and llms.txt so
 * the command, the repository and the claims can't drift apart.
 */

export const GITHUB_URL = "https://github.com/kolinabir/recalfy";
export const GUIDE_URL = `${GITHUB_URL}/blob/main/SELF_HOSTING.md`;

export const NPM_URL = "https://www.npmjs.com/package/recalfy";
export const DESIGN_URL = `${GITHUB_URL}/blob/main/DESIGN.md`;

/** Shown on the page and stated as dateModified — change both together. */
export const UPDATED = "2026-09-28";
export const VERSION = "0.1.1";

/**
 * The first thing on the page, and the passage an answer engine lifts when
 * someone asks what this is. Self-contained on purpose: it must still make
 * sense quoted alone.
 */
export const DEFINITION =
  "Recalfy is an open-source AI memory assistant that lives in Telegram. You tell it things in plain language — a birthday, a wifi password, where you parked — and it remembers them, answers when you ask, and messages you when a reminder is due. Self-hosting it is free and takes one command.";

export const INSTALL_COMMAND = "npx recalfy";
export const SERVER_INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/kolinabir/recalfy/main/install.sh | sh";

export const NEEDS = [
  {
    title: "Docker",
    body: "Docker Desktop or OrbStack on a Mac or PC; the installer below puts it on a Linux server for you.",
  },
  {
    title: "Node.js 20 or newer",
    body: "Only to run the setup command. The bot itself runs in a container.",
  },
  {
    title: "A bot token and an AI key",
    body: "The token comes from @BotFather in thirty seconds. The key is from whichever model provider you pick — or none, with Ollama.",
  },
];

export const STEPS = [
  {
    title: "Make a bot",
    body: "In Telegram, message @BotFather, send /newbot and answer its two questions. It replies with a token.",
  },
  {
    title: "Run the setup",
    body: "Paste the token when asked, pick a model provider and paste its key. Both are checked on the spot, so a typo fails now rather than on your first message.",
  },
  {
    title: "Say hi to your bot",
    body: "Send it any message. Whoever sends it becomes the owner — the only person it will ever talk to. No looking up ids.",
  },
  {
    title: "That's it",
    body: "Setup starts everything and the bot messages you when it's ready. No domain, no HTTPS certificate, no port forwarding.",
  },
];

export const MODELS = [
  { provider: "OpenAI", model: "gpt-5-mini", note: "Reliable; a few dollars a month for one person" },
  { provider: "OpenRouter", model: "openai/gpt-5-mini", note: "One key, hundreds of models" },
  { provider: "Z.ai", model: "glm-5.2", note: "What recalfy.com runs on; cheap" },
  { provider: "Ollama", model: "qwen3:8b or larger", note: "Free and private; runs on your own machine" },
];

export const COMMANDS = [
  { command: "npx recalfy status", does: "Is it running?" },
  { command: "npx recalfy logs", does: "What it's doing, live" },
  { command: "npx recalfy update", does: "Download the newest version" },
  { command: "npx recalfy backup", does: "Save a copy of the whole database" },
  { command: "npx recalfy export", does: "Your memory as Markdown" },
  { command: "npx recalfy stop", does: "Turn it off, keeping everything" },
];

export const HOSTED = [
  "Nothing to install or keep running",
  "A dashboard to browse, search and export your memory",
  "Updates arrive without you doing anything",
  "Seven days free, then a plan",
];

export const SELF_HOSTED = [
  "Free — you pay only your AI provider, or nothing with Ollama",
  "Your memory lives in a database on your machine",
  "Any model: OpenAI, OpenRouter, Z.ai, or a local one",
  "You run updates and backups — one command each",
];

export const TROUBLE = [
  {
    q: "The bot doesn't answer",
    a: "Run npx recalfy logs. A 409 means another copy is running with the same token; a 401 from the model means the key is wrong or out of credit.",
  },
  {
    q: "Reminders arrive at the wrong time",
    a: "Tell the bot where you are — \"I'm in Berlin\" — and it resets your timezone.",
  },
  {
    q: "Permission denied talking to Docker (Linux)",
    a: "Run sudo usermod -aG docker $USER, then log out and back in.",
  },
  {
    q: "Moving to another machine",
    a: "npx recalfy backup on the old one, stop it, run setup on the new one with the same bot token, then npx recalfy restore the file.",
  },
];

/**
 * What it costs to run, from the measured numbers in DESIGN.md: a fact is
 * about 15 tokens, and the whole memory rides in every prompt, cached.
 */
export const COSTS = [
  { item: "Server", cost: "$0 on a machine you already have; about $4–6 a month for a small VPS" },
  { item: "Telegram", cost: "$0" },
  { item: "Database", cost: "$0 — MongoDB runs in the same Docker setup" },
  { item: "AI model, 500 memories", cost: "about $0.75 a month at 30 messages a day (GLM, cached)" },
  { item: "AI model, 2,000 memories", cost: "about $3 a month at the same pace" },
  { item: "AI model, Ollama", cost: "$0 — it runs on your own hardware" },
];

/** Answers kept to a few sentences each, so each one stands on its own. */
export const QUESTIONS = [
  {
    q: "Is Recalfy free to self-host?",
    a: "Yes. The code is open source under the AGPL-3.0 licence and self-hosting costs nothing. You pay only for the AI model you choose — typically under $3 a month for one person — or nothing at all with a local model through Ollama.",
  },
  {
    q: "Do I need a domain, a public IP or HTTPS?",
    a: "No. A self-hosted Recalfy asks Telegram for new messages itself (long polling), so nothing has to reach your machine from outside. It runs behind a home router, on a laptop or on a Raspberry Pi 5 with no port forwarding.",
  },
  {
    q: "Which AI models work with Recalfy?",
    a: "Any OpenAI-compatible chat API whose model supports tool calling: OpenAI, OpenRouter, Z.ai (GLM), Groq, Together, or a local model through Ollama or LM Studio. Tool calling matters because saving facts and setting reminders happen through tools.",
  },
  {
    q: "Where is my data stored?",
    a: "In a MongoDB database inside Docker on your own machine. Your messages still pass through Telegram, and each message is sent to the AI provider you picked — unless that provider is Ollama, in which case nothing leaves your hardware.",
  },
  {
    q: "Can Recalfy run on a Raspberry Pi?",
    a: "Yes, on a Raspberry Pi 5 with a 64-bit OS. The image is published for amd64 and arm64, so Apple Silicon Macs and ARM servers work too. A Pi 4 does not: the MongoDB version Recalfy uses needs a newer ARM processor than the Pi 4 has.",
  },
  {
    q: "How is it different from the hosted version at recalfy.com?",
    a: "It is the same code. Hosted adds a web dashboard, automatic updates and nothing to maintain, for a monthly plan. Self-hosted is free, keeps the database on your machine and lets you pick any model; you run updates and backups yourself, one command each.",
  },
  {
    q: "Does it use a vector database or embeddings?",
    a: "No. Each fact is about 15 tokens, so the whole memory is rendered as Markdown and handed to the model on every message. That is cheaper than retrieval at personal scale, and it lets the model see corrections and contradictions instead of guessing which notes are relevant.",
  },
  {
    q: "Who can use a self-hosted bot?",
    a: "Only its owner — the Telegram account that sent the first message during setup. Anyone else who messages the bot is told it is private, and their messages never reach the AI model.",
  },
];
