# Contributing to Recalfy

Thanks for looking. Recalfy is small on purpose, and this guide is mostly about
keeping it that way.

## Before you start

- **Bugs:** open an issue with what you said to the bot, what it did, and what
  you expected. `npx recalfy logs` output helps a lot. Take out anything
  private first.
- **Features:** open an issue before writing code. Recalfy deliberately leaves
  a lot out (see [DESIGN.md](DESIGN.md)), and it's a shame to build something
  that can't be merged.
- **Security problems:** don't open an issue. See [SECURITY.md](SECURITY.md).

## The layout

```
src/        the bot: one NestJS process (see README → Layout)
cli/        the `recalfy` npm package: setup wizard and management commands
web/        recalfy.com: marketing site, dashboard, billing (hosted only)
test/       unit tests for the bot
scripts/    developer tools: chat with the brain, set the webhook, evals
```

[DESIGN.md](DESIGN.md) explains the decisions that aren't obvious from the
code. The biggest one: there's no vector database. The whole memory is rendered
to Markdown and put in the prompt.

## Running it

You need Node 22 and Docker.

```bash
npm install
cp .env.example .env      # set TELEGRAM_BOT_TOKEN, OWNER_TELEGRAM_ID, LLM_*
npm run db:up             # MongoDB on 127.0.0.1:27017
npm run start:dev         # the bot, in selfhost mode with long polling
```

Make a separate bot in [@BotFather](https://t.me/BotFather) for development.
Two processes polling the same token fight over messages.

You can talk to the brain without Telegram at all:

```bash
npm run chat -- "remind me to call mum at 5"
```

To try the Docker image and the CLI together:

```bash
docker build -t recalfy:dev .
RECALFY_IMAGE=recalfy:dev node cli/bin/recalfy.mjs
```

## Before you open a pull request

```bash
npm run typecheck
npm test
```

Both must pass, and CI runs them again. Then:

- **Add a test** for anything with logic in it. Most of the code is split into
  pure functions (prompt builders, the memory renderer, time parsing) precisely
  so they can be tested without a network or a model.
- **Check both modes** if you touch anything that differs between them.
  `RECALFY_MODE=hosted` is recalfy.com (billing, website linking, webhook);
  `selfhost` is everyone else. Hosted is the default, so a change must never
  make a production box without the new variable behave differently.
- **Keep the model portable.** The bot talks to any OpenAI-compatible API. A
  provider-specific request field goes in `requestExtras`, never
  unconditionally, because other providers reject fields they don't know.
- **Match the surrounding code.** Comments explain *why*, not *what*.
- **Keep pull requests small**, one change each. Say what you tested.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`,
`docs:`, `refactor:`, `test:`, with an optional scope, e.g.
`fix(reminders): …`. The body says why.

## Changelog

A user-visible change adds an entry to `web/lib/changelog-data.ts`, written for
the people using it: one line per thing they can now do, in plain words.

## License

Recalfy is [AGPL-3.0](LICENSE). By contributing, you agree your contribution is
released under the same license.

## Code of conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
