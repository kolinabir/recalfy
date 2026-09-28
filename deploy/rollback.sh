#!/usr/bin/env bash
#
# Puts the previous release back.
#
#   npm run rollback            # step back one release
#   npm run rollback -- 20260815-130000   # or go to a named one
#   npm run releases            # see what is available
#
# This is deliberately the dumbest script here. Rollback runs on the worst day
# someone is having, so it does one thing — move a symlink and restart — with
# no build, no upload, and no network beyond the ssh itself. Every release it
# can choose from is already on the disk.
set -euo pipefail

# Where recalfy.com runs lives outside the repo, in deploy/deploy.env
# (gitignored): RECALFY_HOST, RECALFY_APP_DIR and optionally RECALFY_SSH_KEY.
# shellcheck source=/dev/null
[ -f "$(dirname "$0")/deploy.env" ] && . "$(dirname "$0")/deploy.env"
HOST="${RECALFY_HOST:?Set RECALFY_HOST in deploy/deploy.env, e.g. user@203.0.113.7}"
KEY="${RECALFY_SSH_KEY:-$HOME/.ssh/gcp_recalfy}"
APP="${RECALFY_APP_DIR:?Set RECALFY_APP_DIR in deploy/deploy.env}"
TARGET="${1:-}"

SSH=(ssh -o ConnectTimeout=15 -o BatchMode=yes -i "$KEY" "$HOST")

"${SSH[@]}" "bash -s" <<REMOTE
set -euo pipefail
cd "$APP/releases"

current="\$(basename "\$(readlink -f "$APP/dist")")"
target="$TARGET"

if [ -z "\$target" ]; then
  # One step back: the newest release that is not the one running.
  target="\$(ls -1 | sort -r | grep -v "^\${current}\$" | head -1)"
fi

if [ -z "\$target" ]; then
  echo "✗ nothing to roll back to — only \$current exists"
  exit 1
fi
if [ ! -d "\$target" ]; then
  echo "✗ no such release: \$target"
  ls -1 | sort -r | sed 's/^/    /'
  exit 1
fi
if [ "\$target" = "\$current" ]; then
  echo "✗ \$target is already live"
  exit 1
fi

echo "▸ $APP/dist: \$current → \$target"
ln -sfn "$APP/releases/\$target" "$APP/.dist.next"
mv -Tf "$APP/.dist.next" "$APP/dist"

sudo systemctl restart recalfy

for i in \$(seq 1 10); do
  sleep 1
  if curl -fsS --max-time 2 localhost:3117/health >/dev/null 2>&1; then
    echo "▸ live: \$target (healthy after \${i}s)"
    exit 0
  fi
done

echo "✗ rolled back to \$target but it is not answering — check: journalctl -u recalfy -n 50"
exit 1
REMOTE
