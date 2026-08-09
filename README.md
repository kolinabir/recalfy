# Recalfy

A personal AI assistant that lives in Telegram. You tell it things, it remembers
them. You ask it things, it answers. You ask it to remind you, it does — at the
right time, without you being in the chat.

One NestJS process. MongoDB for storage — Docker locally, Atlas in production.
Telegram is the UI: no frontend, no auth, no sessions — the Telegram user id is
the identity.

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

## Running locally

MongoDB runs in Docker and ngrok gives Telegram a public HTTPS URL to reach
your machine. Nothing but `MONGODB_URI` and `PUBLIC_URL` differs from
production.

### 1. Configure

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

### 4. Set the allowlist

`TELEGRAM_ALLOWED_USERS` takes numeric ids and/or `@usernames`, and the app
refuses to start if it's empty. Start with your `@handle` if that's all you
have — the Bot API can't resolve a username to an id until its owner has
messaged the bot.

Once you've sent the bot a message, swap in the permanent id:

```bash
npm run whoami
```

Prefer ids. A username can be released and claimed by someone else, who would
then inherit access; a numeric id never changes hands. The app logs a warning
at boot while any username is still in the list.

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
