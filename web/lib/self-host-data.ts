/**
 * Self-hosting, as data — shared by /self-host, the home page and llms.txt so
 * the command, the repository and the claims can't drift apart.
 */

export const GITHUB_URL = "https://github.com/kolinabir/recalfy";
export const GUIDE_URL = `${GITHUB_URL}/blob/main/SELF_HOSTING.md`;

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
