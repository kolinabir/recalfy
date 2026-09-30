# Recalfy — Design

NestJS on a small VPS. **MongoDB Atlas** for storage (managed — nothing database-shaped runs on the VPS). Telegram is the UI. The Telegram user id is the identity.

---

## 1. The two decisions that shape everything

### 1.1 Atlas Free (M0) does not support Vector Search

This is the load-bearing fact. Per MongoDB's own free-cluster limitations page, **Free clusters support neither Atlas Search nor Atlas Vector Search** — those need Flex or M10+. So "Atlas + embeddings" is not a free plan; it's **Flex, $8–$30/mo hard-capped** (Flex does include Search and Vector Search on shared nodes), or M10 at ~$57/mo.

Free tier otherwise gives you 512 MB storage, 100 ops/sec, 500 connections, no backups. For one user writing a few facts a day, 512 MB is roughly forever — *provided you aren't storing 2048-float vectors next to every fact.*

### 1.2 So: **no embeddings.** Put the whole memory in the context window.

This isn't a compromise, it's the better design at your scale.

**The arithmetic.** An atomic fact ("rent is due on the 5th") is ~15 tokens. So:

| memories | prompt tokens | cost/message (GLM-4.7 cached @ $0.11/M) | at 30 msg/day |
|---|---|---|---|
| 500 | 7.5 K | $0.0008 | **$0.75/mo** |
| 2,000 | 30 K | $0.0033 | **$3/mo** |
| 5,000 | 75 K | $0.0083 | **$7.50/mo** |

GLM-4.7-Flash is currently **free** on the API, and GLM-5.2 carries a 1M-token context. You will not fill the context window with personal facts this decade. Cached input is billed at roughly a fifth of standard rate and the system prompt is identical every call, so caching does the heavy lifting.

**Why it's better, not just cheaper:**

- Vector recall retrieves *similar* text. It does not understand **negation** ("I don't work Fridays"), **contradiction** ("actually the 3rd"), or **joins across facts** ("what did I say about the flat?" needs the landlord, the rent, the lease date, and the leaky tap — four dissimilar rows). Full context handles all four for free.
- It deletes an entire subsystem: embedding model, vector index, dimension choice, chunking, hybrid fusion, re-embedding everything when you change models.
- Recall quality stops being a retrieval-tuning problem and becomes a prompting problem, which is much easier to debug — you can *read* exactly what the model saw.

**What you give up:** it stops scaling somewhere around 5–20k facts, and every message pays for the whole store. Both are years away, and §5 has the staged exit.

---

## 2. The markdown question — take the format, not the storage

Your instinct is right, and it's the same instinct behind Claude Code's own `MEMORY.md`. But *format* and *storage* are separable, and they have opposite answers.

**Markdown as the prompt format: yes.** A memory rendered as a document reads far better to an LLM than a JSON array. Headings give it structure and grouping for free.

**Markdown files as the store: no** — and not just because you've picked Atlas:

- Every edit means the model **rewrites the whole file**. Output tokens cost 4–20× input, so a 30 K-token memory file costs more to *update once* than to *read a hundred times*. It's exactly backwards.
- Whole-file regeneration drifts. Facts get silently reworded, reordered, or dropped, and you find out months later.
- No per-fact soft delete, no supersession history, no `dueAt` index for reminders.
- No atomic writes. Two overlapping updates and one is gone.

**The synthesis — do both:**

> Store **one Mongo document per atomic fact** (durable, surgical, soft-deletable, tiny writes). At prompt time, **render** those documents into a markdown memory document.

```markdown
# What I know about you
_Timezone: Asia/Kolkata · 47 memories_

## People
- Landlord is Rahim. `mem_a1`
- Rahim's number is +91 98xxx. `mem_a2`

## Home
- Rent is due on the 3rd. `mem_b7` (was: the 5th)

## Recent
- Mentioned the geyser is leaking — 6 Aug. `mem_c2`
```

The model reads a clean document; writes stay row-level. The `mem_xx` ids are what let it call `forget(["mem_a2"])` precisely instead of guessing. And `/export` hands you the same markdown as a file — readable backup, zero extra code.

---

## 3. Architecture

```
Telegram ──▶ Ingress ──▶ Brain ──┬──▶ MemoryStore ──▶ Atlas (M0)
   ▲        (ack in <200ms)      │      └── render() → markdown
   │                             └──▶ ReminderScheduler ──▶ Atlas
   └────────── out-of-band send ───────────┘   (30s tick)
```

Four deep modules. No `Embedder`, no vector index, no Redis.

**`MemoryStore`**
```ts
remember(userId: string, facts: Fact[]): Promise<Stored[]>
render(userId: string): Promise<string>       // → the markdown document
forget(userId: string, ids: string[]): Promise<Memory[]>   // returns what went
```
Hides: supersession, soft delete, dedup, grouping, id minting, the markdown rendering. Deletion test passes loudly — remove it and all of that reappears inside `Brain`.

**`Brain`**
```ts
handle(userId: string, text: string, now: Date): Promise<string>
```
One method. Hides the GLM client, tool schema, agent loop, conversation window, system prompt. `now` is a **parameter**, not `new Date()` — that alone makes every reminder path testable.

**`ReminderScheduler`**
```ts
schedule(userId, text, at): Promise<Reminder>
cancel(id): Promise<void>
list(userId): Promise<Reminder[]>
onDue(cb): void
```
Hides the tick, atomic claiming, at-least-once delivery, restart recovery.

**`Ingress`** — `onMessage(cb)` / `send(userId, text)`. Real + fake adapters; the fake drives the whole product from a test file with no network.

**Explicitly not modules:** an intent classifier (one GLM call with four tools; no tool call = conversation), and any Nest/Telegram decorator wrapper (see §6).

---

## 4. Data model

`userId` is the **account** id — the hex form of the Better Auth `user._id` — not a chat network's id. A chat account is an *address* that resolves to it:

```
user      { _id, email,                                        // Better Auth owns this
            channels: { telegram?: { handle, linkedAt },
                        whatsapp?: { handle, linkedAt } } }     // we add only this
```

That indirection is what lets one person reach the same memory from Telegram and from WhatsApp. A `handle` is that network's own id as a string: a Telegram numeric id, or a WhatsApp `wa_id` (E.164 digits, no `+`). Resolution is one indexed lookup per inbound message, and it doubles as the access gate — an unresolved handle is a stranger, and the message is dropped before storage or a model call.

```
users     { _id: userId, tz: "Asia/Kolkata", createdAt,
            lastChannel, lastInboundAt: { telegram?, whatsapp? } }
messages  { userId, role, text, createdAt }                    // raw log, append-only
memories  { userId, sid: "a1", text, group: "People",
            supersedes: ObjectId?, supersededBy: ObjectId?,
            deletedAt: Date?, createdAt, sourceMessageId }
reminders { userId, text, dueAt, status: pending|claimed|sent|cancelled,
            claimedAt, attempts, createdAt }
```

Indexes: `memories { userId: 1, deletedAt: 1 }`, `reminders { status: 1, dueAt: 1 }`, `messages { userId: 1, createdAt: -1 }`. Three ordinary B-tree indexes — all fine on M0.

`sid` is the short human/LLM-facing id (`a1`, `b7`) that appears in the rendered markdown.

### 4.1 Why `lastInboundAt` is per channel

WhatsApp only permits a free-form message within **24 hours** of the user's own last one. Past that, reaching them at all requires a pre-approved template, which is billed and counts against a daily cap. Telegram has no such rule.

So outbound splits in two, and `channels/outbox.ts` is the only thing that knows which is which:

- **`reply`** — answering something they just said. Window open by construction, always free-form.
- **`notify`** — a due reminder or the daily brief. Free-form if they happen to have messaged in the last 24 hours, an approved template otherwise.

`lastInboundAt` is keyed by channel rather than being a single timestamp because the answer differs per network: someone active on Telegram this morning may have a WhatsApp window that closed days ago.

---

## 5. How each behaviour gets built

### 5.1 Message in
grammY in **webhook** mode behind Caddy (auto-TLS). `setWebhook` with a `secret_token`; verify the `X-Telegram-Bot-Api-Secret-Token` header and 401 otherwise.

**Then allowlist your own Telegram user id.** The webhook URL is public and the bot username is discoverable — without this, strangers write to your memory. First commit, before persistence, before the LLM call.

Return **200 immediately** and process off the request; a GLM call is 2–5 s and Telegram backs off slow webhooks. Fire `sendChatAction: typing`.

### 5.2 The one LLM call
System prompt = instructions + `now` + user timezone + **`MemoryStore.render()`**. Then the last ~10 messages, then the new message. Four tools: `remember`, `forget`, `remind`, `cancel_reminder`. No tool call = ordinary conversation, already grounded because the memory is right there in the prompt. There is no separate "recall" step — recall *is* the prompt.

Keep the memory document early and stable in the prompt so the cache hits.

### 5.3 Storing facts
`remember({ facts: [...] })`. Facts are **atomic** — "landlord is Rahim" and "rent due on the 5th" are two rows. Atomicity is what makes forgetting and superseding surgical later.

### 5.4 Contradictions
Since the model can see every existing fact, it can supersede correctly in one shot: `remember({ facts: [...], supersedes: ["b7"] })`. Old row gets `supersededBy`, drops out of `render()`, stays in the collection for audit. "Rent is due on the 3rd" — one answer, no ambiguity, history intact. **This is the thing full-context buys you that vector recall genuinely cannot.**

### 5.5 Reminders
The model is given `now` and the IANA timezone explicitly and must return an **absolute ISO-8601 instant**. Code then validates — parseable, in the future, within a sane horizon — and rejects rather than silently storing a bad parse. Confirm with the resolved absolute time ("Tomorrow, Mon 10 Aug, 6:00 pm") so a misparse is visible immediately.

Delivery: a 30 s tick (`@nestjs/schedule`) doing
`findOneAndUpdate({ status: 'pending', dueAt: { $lte: now } }, { $set: { status: 'claimed' } })`,
send via `Ingress.send`, mark `sent`. Rows stuck in `claimed` for >5 min go back to `pending` — that's your crash recovery. At-least-once, which is the right trade here (a duplicate reminder is annoying; a missed one is a broken product).

**No Redis, no BullMQ.** At this size Mongo *is* the queue, and a job system is a second thing to keep alive for zero benefit.

### 5.6 Forgetting
The model names `sid`s from the rendered document, so `forget(["a1","a2"])` is exact. Set `deletedAt`, confirm what went by name: "Dropped 3: landlord's name, rent day, his number."

---

## 6. SDKs

| Concern | Pick | Why |
|---|---|---|
| Telegram | **grammY**, raw, inside one Nest provider | ~1.3M weekly downloads vs ~22k for `nestjs-telegraf`; better TypeScript; `webhookCallback()` drops straight into a Nest controller. |
| Nest×Telegram glue | **none** | `@grammyjs/nestjs` and `nestjs-telegraf` are decorator layers that *add* interface surface while hiding nothing — textbook shallow modules. 40 lines of glue beats a dependency you'll fight. |
| LLM | **`openai` npm SDK**, `baseURL: https://api.z.ai/api/paas/v4` | Z.ai ships official **Python and Java** SDKs only — no Node one. They explicitly recommend the OpenAI SDK. Tool calling, streaming and caching all work on the standard wire. |
| LLM abstraction | **skip Vercel AI SDK** | One provider, one call shape. `@ai-sdk/openai-compatible` exists if you later want provider swapping — the `baseURL` seam already gives you most of that. |
| Mongo | **official `mongodb` driver**, not Mongoose | One user, four collections, no populate, no middleware. Mongoose here is interface surface with nothing behind it. |
| Time | **Luxon** | Validating the model's ISO output against the user's IANA zone. |
| Scheduling | **`@nestjs/schedule`** | Built in. One `@Interval(30_000)`. |

**Model choice:** start on **GLM-4.7-Flash** (free on the API). Move to **GLM-4.7** ($0.60/$2.20 per M, $0.11 cached) if tool-calling reliability disappoints. GLM-5.2 (1M context, `reasoning_effort`) is available but overkill.

---

## 7. Deployment & cost

VPS runs **only the Node app** — no database, no JVM. A 1–2 GB box is plenty now.

```
caddy   → auto-TLS, reverse-proxies /webhook
app     → NestJS: webhook + scheduler + agent, one process
```

Atlas M0 (free) with IP allowlist set to the VPS address. M0 has **no backups** — so run a nightly `mongodump` from the VPS to object storage. That is not optional; it's your entire memory.

| item | cost |
|---|---|
| VPS (Hetzner CX11-class) | ~€4/mo |
| Atlas M0 | $0 |
| Telegram | $0 |
| GLM-4.7-Flash | $0 |
| **total** | **~€4/mo** |

---

## 8. Build order

1. grammY webhook + secret-token check + allowlist guard + echo. **Live on the VPS with TLS before anything else.**
2. Atlas M0 connected, collections + indexes, `MemoryStore.render()` returning markdown from hand-seeded rows.
3. `Brain` with GLM + `remember`/`forget`. Product is usable here.
4. `ReminderScheduler` + tick. The out-of-band send is the moment it stops being a chatbot.
5. Supersession, `/start` timezone onboarding, `/export`, nightly `mongodump`.

Steps 1–3 are a weekend.

---

## 9. The exit ramp, if it ever grows

Do these **in order**, and only when you can measure the need:

1. **Now → ~2k facts:** render everything. Current design.
2. **~2k–20k:** keep the last N + a "core facts" set always in prompt; for the rest, have the model emit 2–3 keywords and pull matching rows with a Mongo `$text` index. Still no embeddings, still M0.
   **Built 2026-10-01**, triggered earlier than planned — at 300 facts, not 2k, because the Keep cap is 2k and a fact measured ~18 tokens. See `src/memory/core-selection.ts`: past 300 live facts the prompt carries the newest 200 plus Goals, and `search_memory` ranks the rest in-process (no `$text` index needed at one user's scale).
3. **20k+ or recall visibly failing:** move to **Atlas Flex** ($8–30/mo, hard-capped, includes Vector Search) and add embeddings *alongside* the full-context path, not replacing it.

Also worth revisiting later:
- **Voice notes** — Telegram hands you the file; a transcription call in front of `Brain.handle` and nothing else changes. Highest-value cheap feature after v1.
- **Multi-user** — the allowlist becomes a `users` collection with an invite flow, and 512 MB / 100 ops-sec starts to bite.

---

## Sources

- [Atlas Free Cluster Limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) — confirms no Search / Vector Search on M0
- [Atlas Flex tier announcement](https://www.mongodb.com/company/blog/product-release-announcements/dynamic-workloads-predictable-costs-mongodb-atlas-flex-tier) · [Atlas Flex costs](https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/)
- [Z.AI quick start — OpenAI SDK compatibility](https://docs.z.ai/guides/overview/quick-start) · [Z.ai GLM API pricing breakdown](https://developer.puter.com/tutorials/zai-glm-api-pricing/)
- [grammY framework comparison](https://grammy.dev/resources/comparison) · [npm trends: grammy vs nestjs-telegraf](https://npmtrends.com/botgram-vs-grammy-vs-nestjs-telegraf-vs-telebot-vs-telegraf-vs-telegram-bot-api)
