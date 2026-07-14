#!/usr/bin/env bash
# Upgrades the dashboard on this host to the latest origin/main: pull, rebuild,
# restart, health-check — and roll back if the new code doesn't come up.
#
#   bash deploy/update.sh            # upgrade if origin/main has moved
#   bash deploy/update.sh --force    # rebuild + restart even if it hasn't
#
# Installed as a daily systemd timer by update_setup.sh, and safe to run by hand
# at any time. A run with nothing to do is a quiet no-op.
#
# Rollback matters here beyond the usual: db.py's _migrate() runs on boot and can
# rebuild tables, so a bad deploy can touch *data*, not just code — hence the DB
# backup before anything moves.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$REPO_DIR/backend"
FRONTEND="$REPO_DIR/frontend"
BRANCH="main"
HEALTH_URL="http://127.0.0.1:5000/api/health"
BACKUP_DIR="$BACKEND/backups"
KEEP_BACKUPS=7
LOCK="/tmp/garmin-dashboard.lock"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

log() { echo "[$(date '+%F %T')] $*"; }

# The hourly fetcher takes the same lock (see cron_setup.sh): a sync must not be
# running while we swap code out from under it.
exec 9>"$LOCK"
if ! flock -n 9; then
  log "another update or sync holds $LOCK — skipping this run."
  exit 0
fi

cd "$REPO_DIR"

git fetch --quiet origin "$BRANCH"
OLD_SHA="$(git rev-parse HEAD)"
NEW_SHA="$(git rev-parse "origin/$BRANCH")"

if [ "$OLD_SHA" = "$NEW_SHA" ] && [ "$FORCE" -eq 0 ]; then
  log "already at ${NEW_SHA:0:8} — nothing to do."
  exit 0
fi

log "updating ${OLD_SHA:0:8} -> ${NEW_SHA:0:8}"

# --- back up the DB before any migration can touch it ------------------------
if [ -f "$BACKEND/garmin.db" ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP="$BACKUP_DIR/garmin.db.$(date '+%Y%m%d-%H%M%S')"
  # .backup is safe on a live DB; plain cp can catch a half-written page.
  if command -v sqlite3 > /dev/null 2>&1; then
    sqlite3 "$BACKEND/garmin.db" ".backup '$BACKUP'"
  else
    cp "$BACKEND/garmin.db" "$BACKUP"
  fi
  log "backed up DB -> $BACKUP"
  # Keep the newest $KEEP_BACKUPS.
  ls -1t "$BACKUP_DIR"/garmin.db.* 2>/dev/null | tail -n "+$((KEEP_BACKUPS + 1))" | xargs -r rm --
fi

DIST="$FRONTEND/dist"
DIST_OLD="$FRONTEND/dist.old"
DIST_NEW="$FRONTEND/dist.new"

rollback() {
  log "!! deploy failed — rolling back to ${OLD_SHA:0:8}"
  git checkout --quiet --force "$OLD_SHA" || log "   (git checkout failed)"
  rm -rf "$DIST_NEW"
  if [ -d "$DIST_OLD" ]; then
    rm -rf "$DIST"
    mv "$DIST_OLD" "$DIST"
    log "   restored previous dist/"
  fi
  sudo -n systemctl restart garmin-api || true
  log "!! rolled back. Investigate with: sudo journalctl -u garmin-api -n 50"
  exit 1
}

git checkout --quiet "$BRANCH"
git reset --quiet --hard "$NEW_SHA"

# --- backend deps: only when they actually changed ----------------------------
if ! git diff --quiet "$OLD_SHA" "$NEW_SHA" -- backend/requirements.txt; then
  log "requirements.txt changed — installing"
  "$BACKEND/venv/bin/pip" install -q -r "$BACKEND/requirements.txt" || rollback
fi

# --- frontend: build to a temp dir, then swap ---------------------------------
# Never build straight into dist/ — nginx is serving it, and a failed or
# interrupted build would leave a half-written bundle on the wall display.
log "building frontend"
cd "$FRONTEND"
rm -rf "$DIST_NEW"
npm ci --silent || rollback
npx vite build --outDir "$DIST_NEW" --emptyOutDir || rollback

# Stamp the build so the kiosk can notice it and reload itself (see
# useVersionCheck.js) — nothing else can: the kiosk is autostarted Chromium, not
# a service we could restart.
printf '{"sha":"%s","built":"%s"}\n' "$NEW_SHA" "$(date -u '+%FT%TZ')" > "$DIST_NEW/version.json"

rm -rf "$DIST_OLD"
[ -d "$DIST" ] && mv "$DIST" "$DIST_OLD"
mv "$DIST_NEW" "$DIST"
log "swapped in new dist/"

# --- restart + health check ---------------------------------------------------
cd "$REPO_DIR"
sudo -n systemctl restart garmin-api || rollback

for _ in $(seq 1 15); do
  if curl -fsS "$HEALTH_URL" > /dev/null 2>&1; then
    log "health OK — now at ${NEW_SHA:0:8}"
    rm -rf "$DIST_OLD"
    exit 0
  fi
  sleep 1
done

log "health check never passed"
rollback
