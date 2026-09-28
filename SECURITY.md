# Security

Recalfy holds people's private memories, including things like passwords they
asked it to keep. Security reports are taken seriously and answered quickly.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately, either way:

- GitHub: **Security → Report a vulnerability** on this repository
- Email: **knkolin9@gmail.com**, with "security" in the subject

Include what you found, how to reproduce it, and what someone could do with it.
You'll get a reply within 72 hours. Please give us a reasonable chance to fix
it before you disclose it publicly. We'll credit you unless you'd rather not
be named.

## What is in scope

- One person reading or changing another person's memory, reminders or account
- Getting the bot to answer someone who isn't linked or isn't the owner
- Forged webhook calls (Telegram's secret token, WhatsApp's signature)
- The dashboard and billing on recalfy.com
- The `recalfy` CLI and `install.sh`, including how they handle keys

## Running your own copy safely

- `~/.recalfy/.env` holds your bot token and AI key. Setup makes it readable
  only by you. Keep it that way.
- The database isn't exposed outside Docker's network. Don't publish its port.
- Anyone who has your bot token can read your bot's messages. If it leaks,
  revoke it in @BotFather with `/revoke`, then run `npx recalfy` again.
- Run `npx recalfy update` now and then to get security fixes.
