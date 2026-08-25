#!/usr/bin/env bash
#
# Ships the current build to the VPS as a new, immutable release.
#
#   npm run deploy
#
# Releases are directories under ~/recalfy/releases and `dist` is a symlink at
# whichever one is live. Deploying never edits a release that is running: the
# new one is uploaded beside it and the symlink is moved, so the switch is a
# single atomic operation and the previous build is still sitting there intact.
# That is the whole reason rollback can be instant — it is one symlink move,
# not a rebuild and not a re-upload.
#
# If the service does not come back healthy, this script puts the old release
# back on its own. A deploy that fails should leave the box exactly as it was,
# without needing whoever ran it to still be watching.
set -euo pipefail

HOST="${RECALFY_HOST:-knkolin9@136.66.250.175}"
KEY="${RECALFY_SSH_KEY:-$HOME/.ssh/gcp_recalfy}"
APP="${RECALFY_APP_DIR:-/home/knkolin9/recalfy}"
KEEP="${RECALFY_KEEP_RELEASES:-5}"
# A cold release is slow: its files are not in page cache yet, and this box has
# 955MB of RAM and a swapfile. A deploy on 25 Aug 2026 was rolled back after
# ten seconds while the app was still booting normally — Nest had not even
# finished starting. The window is generous now because the loop below exits
# the moment the unit actually dies, so a real failure still fails fast.
HEALTH_TRIES=45

SSH=(ssh -o ConnectTimeout=15 -o BatchMode=yes -i "$KEY" "$HOST")
STAMP="$(date -u +%Y%m%d-%H%M%S)"

cd "$(dirname "$0")/.."

echo "▸ building"
npm run build >/dev/null

echo "▸ uploading release $STAMP"
PREVIOUS="$("${SSH[@]}" "readlink -f $APP/dist 2>/dev/null || true")"

# --link-dest hardlinks against the running release where it can. In practice
# it saves little, because `nest build` rewrites every file and rsync compares
# mtimes — measured at zero saving on a normal deploy. Left in because it costs
# nothing and does help when a release is genuinely unchanged; not relied on. A
# release is ~1MB and five are kept, so the ceiling is single-digit megabytes
# against 24GB free.
LINK_DEST=()
[ -n "$PREVIOUS" ] && LINK_DEST=(--link-dest="$PREVIOUS")

"${SSH[@]}" "mkdir -p $APP/releases/$STAMP"
rsync -az --delete "${LINK_DEST[@]}" \
  -e "ssh -o ConnectTimeout=15 -o BatchMode=yes -i $KEY" \
  dist/ "$HOST:$APP/releases/$STAMP/"

echo "▸ switching and restarting"
"${SSH[@]}" "bash -s" <<REMOTE
set -euo pipefail
cd "$APP"

# ln -sfn onto a temp name then mv is the atomic form; \`ln -sfn\` straight at
# an existing symlink is not, and can leave dist pointing inside itself.
ln -sfn "$APP/releases/$STAMP" .dist.next
mv -Tf .dist.next dist

sudo systemctl restart recalfy

for i in \$(seq 1 $HEALTH_TRIES); do
  sleep 1
  if curl -fsS --max-time 2 localhost:3117/health >/dev/null 2>&1; then
    echo "  healthy after \${i}s"
    ok=1
    break
  fi
  # A unit that has stopped is never going to answer. Waiting out the rest of
  # the window would turn a crash into a minute of silence.
  if ! systemctl is-active --quiet recalfy; then
    echo "  ✗ service died during startup"
    break
  fi
done

if [ -z "\${ok:-}" ]; then
  echo "  ✗ unhealthy — rolling back to ${PREVIOUS:-the previous release}"
  if [ -n "${PREVIOUS:-}" ]; then
    ln -sfn "$PREVIOUS" .dist.next && mv -Tf .dist.next dist
    sudo systemctl restart recalfy
  fi
  exit 1
fi

# Keep the last few so rollback has somewhere to go, and prune the rest. The
# running release is never a candidate — \`ls\` is sorted by name, and the
# stamps sort chronologically.
cd "$APP/releases"
ls -1 | sort -r | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "\$old" = "$STAMP" ] && continue
  rm -rf -- "\$old"
  echo "  pruned \$old"
done
REMOTE

echo "▸ live: $STAMP"
"${SSH[@]}" "curl -fsS localhost:3117/health && echo"
