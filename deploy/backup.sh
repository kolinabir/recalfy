#!/usr/bin/env bash
# Atlas M0 has no backups. This is the only copy of your memory that isn't
# in a free cluster — run it nightly from cron:
#
#   0 3 * * * /srv/recalfy/deploy/backup.sh >> /var/log/bot-backup.log 2>&1
#
# Every archive is encrypted with `age` before it touches the disk, because a
# dump holds every fact verbatim — passwords included. The box only ever has
# the *public* key (BACKUP_AGE_RECIPIENT in .env), so someone who takes the
# server can write backups but cannot read a single old one. The private key
# lives off the box, with whoever may restore.
#
# One-time setup:
#   apt install age                      # on the server
#   age-keygen -o recalfy-backup.key     # on YOUR machine; keep this file safe
#   # put the "public key: age1…" line from it in the server's .env:
#   BACKUP_AGE_RECIPIENT=age1…
#
# Restoring:
#   age -d -i recalfy-backup.key recalfy-<stamp>.archive.gz.age \
#     | mongorestore --uri="$MONGODB_URI" --archive --gzip --drop
set -euo pipefail

cd "$(dirname "$0")/.."
set -a && source .env && set +a

# Refuses rather than falling back to plaintext. A backup that quietly stops
# being encrypted is worse than a cron log that says why it failed.
RECIPIENT="${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT in .env — see the setup notes at the top of this script}"
command -v age >/dev/null || { echo "age is not installed (apt install age)" >&2; exit 1; }

BACKUP_DIR="${BACKUP_DIR:-/srv/backups/recalfy}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
ARCHIVE="${BACKUP_DIR}/${MONGODB_DB}-${STAMP}.archive.gz.age"
PARTIAL="${ARCHIVE}.partial"

mkdir -p "$BACKUP_DIR"
umask 077

# Written under a temporary name and renamed on success, so a dump that dies
# halfway never sits in the directory looking like a good backup.
trap 'rm -f "$PARTIAL"' EXIT
mongodump --uri="$MONGODB_URI" --db="$MONGODB_DB" --archive --gzip | age -r "$RECIPIENT" -o "$PARTIAL"
mv "$PARTIAL" "$ARCHIVE"

# The old unencrypted *.archive.gz files are swept too, on the same schedule.
find "$BACKUP_DIR" \( -name '*.archive.gz.age' -o -name '*.archive.gz' \) -mtime "+${KEEP_DAYS}" -delete
echo "Backed up to ${ARCHIVE}"
