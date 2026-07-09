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
CRON_LINE="0 * * * * cd $BACKEND_DIR && ./venv/bin/python fetch_garmin.py >> logs/fetch.log 2>&1"

mkdir -p "$BACKEND_DIR/logs"

( crontab -l 2>/dev/null | grep -vF "$BACKEND_DIR/fetch_garmin.py" ; echo "$CRON_LINE" ) | crontab -

echo "Installed cron job:"
echo "  $CRON_LINE"
echo "View with: crontab -l"
