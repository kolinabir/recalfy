# recalfy

Run your own [Recalfy](https://recalfy.com): a personal AI memory that lives in
Telegram. Tell it things and it remembers them. Ask it things and it answers.
Ask it to remind you and it does.

```bash
npx recalfy
```

You need Docker and Node.js 20+. Setup asks for a Telegram bot token (from
[@BotFather](https://t.me/BotFather)) and an AI key (OpenAI, OpenRouter, Z.ai,
any OpenAI-compatible API, or Ollama with no key). Then you message your bot
and you're done. No domain or HTTPS needed.

| | |
|---|---|
| `npx recalfy status` | is it running? |
| `npx recalfy logs` | what it is doing |
| `npx recalfy update` | newest version |
| `npx recalfy backup` / `restore <file>` | a copy of the whole database |
| `npx recalfy export` | your memory as Markdown (`--json` for everything) |
| `npx recalfy stop` / `start` / `restart` | on and off |
| `npx recalfy uninstall` | remove it (`--delete-data` erases memory too) |

Full guide: [SELF_HOSTING.md](https://github.com/kolinabir/recalfy/blob/main/SELF_HOSTING.md).
License: AGPL-3.0.
