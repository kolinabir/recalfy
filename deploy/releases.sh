#!/usr/bin/env bash
#
# What is on the box and what is live.
#
#   npm run releases
set -euo pipefail

HOST="${RECALFY_HOST:-knkolin9@136.66.250.175}"
KEY="${RECALFY_SSH_KEY:-$HOME/.ssh/gcp_recalfy}"
APP="${RECALFY_APP_DIR:-/home/knkolin9/recalfy}"

ssh -o ConnectTimeout=15 -o BatchMode=yes -i "$KEY" "$HOST" "bash -s" <<REMOTE
set -euo pipefail
current="\$(basename "\$(readlink -f "$APP/dist" 2>/dev/null || echo none)")"

echo "release            size   deployed"
cd "$APP/releases" 2>/dev/null || { echo "(no releases directory — deploy once first)"; exit 0; }

for r in \$(ls -1 | sort -r); do
  marker="  "
  [ "\$r" = "\$current" ] && marker="→ "
  printf "%s%-16s %6s  %s\n" "\$marker" "\$r" \
    "\$(du -sh "\$r" | cut -f1)" \
    "\$(date -r "\$r" '+%Y-%m-%d %H:%M')"
done

echo
systemctl is-active recalfy >/dev/null && echo "service: active" || echo "service: NOT running"
curl -fsS --max-time 2 localhost:3117/health 2>/dev/null && echo || echo "health: no answer"
REMOTE
