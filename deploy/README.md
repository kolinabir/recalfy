# Deploying, and getting back

Two halves ship separately. The **bot** goes to the VPS; the **dashboard and
marketing site** go to Vercel. Neither knows about the other's deploys, so a
rollback is always "roll back which half?".

## The bot (VPS)

```bash
npm run deploy      # build, upload as a new release, switch, restart
npm run releases    # what is on the box, and which one is live
npm run rollback    # step back one release
npm run rollback -- 20260815-124900-location   # or name one
```

Every deploy lands in its own directory under `~/recalfy/releases/` and
`~/recalfy/dist` is a symlink pointing at whichever is live. Deploying never
touches a release that is running: the new one is uploaded beside it and the
symlink moves.

That is the whole reason rollback is instant — **one symlink move and a
restart**, no rebuild and no upload, because every release it can choose from
is already on the disk. A rollback takes about five seconds and needs nothing
from your machine but the ssh connection.

If a deploy comes up unhealthy, `release.sh` puts the previous release back on
its own rather than leaving the box down for whoever was watching to notice.

Five releases are kept. Older ones are pruned on each deploy.

### What rollback does *not* undo

- **Environment variables.** `.env` lives at `~/recalfy/.env`, outside the
  releases, so it is shared by all of them. A deploy that needed a new variable
  will still need it after rolling back, and a rolled-back build may not
  understand a variable that was added for the newer one.
- **The database.** Mongo is shared. If a release wrote data in a new shape,
  going back to code that does not expect it will not unwrite it.

Both are the usual reason a rollback "doesn't work". Check them first.

## The site (Vercel)

Vercel keeps every deployment, so rollback is built in and does not need this
repo:

1. Vercel dashboard → the project → **Deployments**
2. Find the last known-good one
3. **⋯ → Instant Rollback** (or **Promote to Production**)

It re-points the production domain at a build that already exists, so it takes
seconds and cannot fail to build.

With the CLI installed (`npm i -g vercel`, then `vercel login`) the same thing
is `vercel rollback`. It is not installed here — the dashboard is the path
until it is.

**The same two caveats apply, and bite harder:** Vercel environment variables
are set per-environment and are *not* versioned with a deployment, so rolling
back code does not roll back a variable you changed alongside it. The Paddle
price ids and `TELEGRAM_BOT_USERNAME` are the ones that have already caused
trouble here.

### Testing without touching production

Push a branch and Vercel builds a **preview** at its own URL. That is the place
to try anything you are not sure about — it shares the database, but not the
domain.

## When something is wrong and you do not know which half

Ask what broke:

- Bot stopped replying in the chat, reminders stopped → **VPS**
- Dashboard, pricing page, login, connect button → **Vercel**
- Both at once → almost certainly neither: look at Mongo Atlas and the
  environment before rolling anything back.
