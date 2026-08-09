#!/usr/bin/env bash
# Atlas M0 has no backups. This is the only copy of your memory that isn't
# in a free cluster — run it nightly from cron:
#
#   0 3 * * * /srv/recalfy/deploy/backup.sh >> /var/log/bot-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
set -a && source .env && set +a

BACKUP_DIR="${BACKUP_DIR:-/srv/backups/recalfy}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
ARCHIVE="${BACKUP_DIR}/${MONGODB_DB}-${STAMP}.archive.gz"

mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGODB_URI" --db="$MONGODB_DB" --archive="$ARCHIVE" --gzip

find "$BACKUP_DIR" -name '*.archive.gz' -mtime "+${KEEP_DAYS}" -delete
echo "Backed up to ${ARCHIVE}"
