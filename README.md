# Recalfy

A personal AI memory that lives in Telegram. You tell it things, it remembers
them. You ask it things, it answers. You ask it to remind you, it does — at the
right time, without you being in the chat.

Use it hosted at [recalfy.com](https://recalfy.com), or run your own copy for
free with the command below.

## Run your own

You need [Docker](https://docker.com/products/docker-desktop) and
[Node.js 20+](https://nodejs.org). Then:

```bash
npx recalfy
```

The setup asks for two things and does the rest:

1. **A bot token.** Message [@BotFather](https://t.me/BotFather), send
   `/newbot`, paste what it gives you.
2. **An AI key.** OpenAI, OpenRouter, Z.ai, any OpenAI-compatible API, or
   [Ollama](https://ollama.com) on your own machine with no key at all.

Then it asks you to send your new bot a message, which is how it learns who
you are. There's no domain, HTTPS certificate or port forwarding to set up. It
works on a laptop, a Raspberry Pi 5 or a $4 VPS.

On a fresh Linux server, this installs Docker and Node first:

```bash
curl -fsSL https://raw.githubusercontent.com/kolinabir/recalfy/main/install.sh | sh
```

Afterwards:

| | |
|---|---|
| `npx recalfy status` | is it running? |
| `npx recalfy logs` | what it is doing |
| `npx recalfy update` | newest version |
| `npx recalfy backup` / `restore <file>` | a copy of the whole database |
| `npx recalfy export` | your memory as Markdown (`--json` for everything) |
| `npx recalfy stop` | turn it off, keeping everything |

More in [SELF_HOSTING.md](SELF_HOSTING.md).

## How it works

One NestJS process. MongoDB for storage. Telegram is the UI — the Telegram
user id is the identity.

Design rationale, trade-offs and the cost model live in [DESIGN.md](DESIGN.md).
The short version: **there are no embeddings and no vector index.** The whole
memory is rendered to markdown and handed to the model in the system prompt,
which is cheaper, simpler, and better at contradictions than retrieval.

## Status

Steps 1–4 of [DESIGN.md §8](DESIGN.md) are done. **There are no commands** —
everything is plain conversation, and the model decides what to do:

| you say | what happens |
|---|---|
| (first ever message) | it introduces itself and asks your name and where you are |
| "im kolin from bangladesh" | name stored, timezone set to Asia/Dhaka |
| "hey im from bangladesh" | timezone set to Asia/Dhaka, without being asked |
| "my landlord is Rahim and rent is due on the 5th" | stored as two separate facts |
| "actually rent moved to the 3rd" | supersedes the old fact — no contradiction left behind |
| "what's my rent day?" | answered from memory, no citation |
| "remind me to call rahim at 5 today" | scheduled, confirmed with the resolved time |
| (at 5pm, unprompted) | "⏰ Call Rahim" |
| "forget the landlord stuff" | soft-deleted, confirms what went |

## Layout

```
src/
  config/      Env — typed, validated at boot, fails fast
  mongo/       Connection, typed collections, index definitions
  memory/      MemoryStore, the pure markdown renderer, dedup, short-id minting
  llm/         GlmClient — the model behind one method
  brain/       The agent loop, the system prompt, and one class per tool
  reminders/   Store, 30s scheduler with atomic claims, Telegram delivery
  telegram/    grammY ingress, webhook controller, secret guard, allowlist
  bot/         Turn handling: identify, ack, log, think, reply
test/          Unit tests for the pure pieces
scripts/       chat (talk to the brain from the terminal), webhook, whoami, seed
deploy/        Caddyfile, systemd unit, backup script
```

The seams that matter: `Ingress` (so the product can be driven without a
network), `Tool` (returns the string the model reads, so it's testable by
calling it), `renderMemoryDocument` and `buildSystemPrompt` (both pure — data
in, prompt out), and `resolveWhen` (the guard that stops a model misparse from
becoming a silently wrong reminder).

## Developing

### Running locally

MongoDB runs in Docker and ngrok gives Telegram a public HTTPS URL to reach
your machine. Nothing but `MONGODB_URI` and `PUBLIC_URL` differs from
production.

### 1. Configure

`.env.example` starts in `selfhost` mode. To work on the website's linking
flow or billing, set `RECALFY_MODE=hosted`.

```bash
cp .env.example .env
openssl rand -hex 32   # → TELEGRAM_WEBHOOK_SECRET
```

`TELEGRAM_BOT_TOKEN` comes from [@BotFather](https://t.me/BotFather). A missing
variable fails at boot rather than at 3am.

### 2. Start the database

```bash
npm run db:up
```

A `mongo:8` container bound to `127.0.0.1:27017`, with a named volume so data
survives restarts. No replica set needed — nothing here uses change streams or
transactions.

### 3. Open the tunnel

```bash
npm run tunnel
```

Copy the `https://…ngrok-free.app` URL into `PUBLIC_URL`. **A free ngrok URL
changes every restart**, so redo this and `webhook:set` each session.

The tunnel points at `127.0.0.1:$PORT`, not `localhost:$PORT`, and `PORT`
defaults to 3117 rather than 3000. Both are deliberate: on macOS `localhost`
resolves to `::1` first, so if any other dev server holds `*:3000` on IPv6 it
silently swallows every Telegram update — the app looks healthy on
`127.0.0.1` while Telegram gets 404s. Check the tunnel end to end with
`curl "$PUBLIC_URL/health"`; it must return this app's JSON.

### 4. Connect your Telegram account

There is no allowlist to fill in. Access is granted by linking: sign in at
recalfy.com, press **Connect Telegram**, and the site sends you to the bot
carrying a one-time token. Pressing **Start** completes the handshake and
attaches your Telegram id to the web account.

Until then the bot ignores you, which is the point — the webhook URL is public
and the bot username is discoverable. A bare `/start` from an unlinked sender
gets one pointer back to the site and nothing else.

`/unlink` in the chat detaches it again.

Linking never asks for a `@username`. Usernames can be released and claimed by
someone else, who would inherit the connection; the numeric id never changes
hands, and pressing Start is what proves the account is yours.

### 5. Run

```bash
npm run build && npm start   # or: npm run start:dev
npm run webhook:set
```

Verify with `npm run webhook:info`: `pending_update_count` should stay at 0 and
`last_error_message` should be absent. ngrok's inspector at
<http://127.0.0.1:4040> shows every update Telegram delivers.

## Going to production

Two environment variables change:

- `MONGODB_URI` → an Atlas **Free (M0)** cluster, with the VPS IP allowlisted
  under *Network Access*. M0 has **no backups**, so put `deploy/backup.sh` on a
  nightly cron — it is the only copy of your memory that isn't in a free cluster.
- `PUBLIC_URL` → your own domain, fronted by Caddy.

Then:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile     # edit the hostname first
sudo cp deploy/recalfy.service /etc/systemd/system/
sudo systemctl enable --now recalfy
```

Caddy obtains and renews the certificate itself. The unit runs as an
unprivileged `bot` user with a read-only filesystem outside its own directory.

## The model

Z.ai speaks the OpenAI wire protocol, so this is the official `openai` SDK with
a different `baseURL` — swapping providers is a config change, not a code one.

Two things worth knowing:

- **Thinking is disabled** (`thinking: {type: 'disabled'}`, a Z.ai extension).
  GLM reasoning models otherwise spend the whole turn in `reasoning_content`
  and return an empty `content`, which surfaces as the bot saying nothing. It
  also roughly halves latency.
- **`glm-4.7-flash` is free but unusably rate-limited** for conversation. The
  default is `glm-4.7` — about $0.60/M in, $0.11/M cached, so pennies a month
  at one user.

### Prompt layout is load-bearing

`buildSystemPrompt` puts persona, rules and the memory document first, then the
clock and a short closing imperative. Two reasons, and both were learned the
hard way:

- The stable part comes first so the provider's prompt cache matches the
  longest possible prefix.
- The imperative comes **last** because a rule buried in a long list gets
  dropped. With the storage rule mid-list, the model would reply "got it,
  rent is now due on the 3rd" and store nothing — the correction lost, the
  user told it was saved. Moved to the end and cut to four lines, storing and
  superseding went to 3/3 in a row.

Onboarding replaces that closing block until the user's location is known,
so a new user is asked who and where they are before anything else.

## Development

```bash
npm run chat -- "remind me to call mum at 5"   # talk to the brain, no Telegram
npm run chat -- --user 123456789 "what do you know about me?"
npm run chat -- --reset                        # wipe the scratch user
npm run start:dev   # watch mode
npm test            # unit tests
npm run typecheck   # tsc --noEmit
```

`npm run chat` runs against a scratch user id by default, so experimenting
never touches real memories.

## Contributing

Issues and pull requests are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). Security problems go through
[SECURITY.md](SECURITY.md) instead.

## License

[AGPL-3.0](LICENSE). You can run it, change it and share it. If you offer a
modified version to other people as a service, you have to publish your
changes under the same license.
