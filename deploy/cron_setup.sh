#!/usr/bin/env bash
# Installs the hourly Garmin fetch cron job (runs under the current OS user's
# crontab). fetch_garmin.py syncs every user configured in backend/.env and
# refreshes the last few days of daily wellness on each run.
#
# One-time, after first deploy: populate wellness history with
#   cd backend && ./venv/bin/python fetch_garmin.py --wellness 90
#
# Run from the deploy/ directory: bash cron_setup.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/backend"

# flock against the same lock deploy/update.sh takes: a sync must never run while
# a deploy is swapping code and rebuilding under it. -n = if a deploy holds the
# lock, skip this hour rather than queue up behind it (the next sync is an hour
# away, and incremental sync catches up anyway).
CRON_LINE="0 * * * * /usr/bin/flock -n /tmp/garmin-dashboard.lock -c 'cd $BACKEND_DIR && ./venv/bin/python fetch_garmin.py >> logs/fetch.log 2>&1'"

mkdir -p "$BACKEND_DIR/logs"

# Match on the backend path: the old filter looked for "$BACKEND_DIR/fetch_garmin.py",
# a string this line never contained, so re-running this script appended a second
# copy of the job every time.
( crontab -l 2>/dev/null | grep -vF "$BACKEND_DIR" ; echo "$CRON_LINE" ) | crontab -

echo "Installed cron job:"
echo "  $CRON_LINE"
echo "View with: crontab -l"
