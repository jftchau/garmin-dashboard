#!/usr/bin/env bash
# Renders and installs the host-specific deploy files (nginx site + systemd unit)
# from the .template files next to this script, substituting the *actual* repo
# path and OS user. Nothing in the repo hardcodes /home/pi any more, so this
# works on any host (and on a rebuilt SD card) with no hand-editing.
#
# Run as your normal user, from anywhere — it calls sudo only for the /etc parts:
#   bash deploy/install.sh              # show the diff, then install
#   bash deploy/install.sh --dry-run    # show what would change, install nothing
#
# Safe to re-run: rendering is deterministic, so a no-op run installs identical
# files.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
RUN_USER="${SUDO_USER:-$USER}"

NGINX_SITE="/etc/nginx/sites-available/garmin"
NGINX_LINK="/etc/nginx/sites-enabled/garmin"
SYSTEMD_UNIT="/etc/systemd/system/garmin-api.service"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

if [ "$(id -u)" -eq 0 ] && [ -z "${SUDO_USER:-}" ]; then
  echo "install.sh: run as your normal user (it sudo's on its own), not as root." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

render() {
  sed -e "s|@REPO_DIR@|$REPO_DIR|g" -e "s|@USER@|$RUN_USER|g" "$1" > "$2"
}

render "$DEPLOY_DIR/nginx.conf.template"        "$TMP/garmin"
render "$DEPLOY_DIR/garmin-api.service.template" "$TMP/garmin-api.service"

echo "Repo:  $REPO_DIR"
echo "User:  $RUN_USER"
echo

# Show what would change against whatever is live right now. On a Pi that was set
# up by hand, this is the moment you find out where the two have drifted.
show_diff() {
  local live="$1" new="$2" label="$3"
  if [ -f "$live" ]; then
    if sudo diff -u "$live" "$new" > "$TMP/diff.out"; then
      echo "== $label: unchanged"
    else
      echo "== $label: would change"
      sed 's/^/   /' "$TMP/diff.out"
    fi
  else
    echo "== $label: not installed yet (would be created)"
  fi
  echo
}

show_diff "$NGINX_SITE"   "$TMP/garmin"             "nginx  $NGINX_SITE"
show_diff "$SYSTEMD_UNIT" "$TMP/garmin-api.service" "systemd $SYSTEMD_UNIT"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "--dry-run: nothing installed."
  exit 0
fi

sudo install -m 644 "$TMP/garmin" "$NGINX_SITE"
sudo ln -sfn "$NGINX_SITE" "$NGINX_LINK"
sudo nginx -t
sudo systemctl reload nginx

sudo install -m 644 "$TMP/garmin-api.service" "$SYSTEMD_UNIT"
sudo systemctl daemon-reload
sudo systemctl enable --now garmin-api
sudo systemctl restart garmin-api

echo
echo "Installed. Checking the API is up..."
for _ in $(seq 1 10); do
  if curl -fsS http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
    echo "  /api/health OK"
    exit 0
  fi
  sleep 1
done

echo "  /api/health did NOT come up — check: sudo journalctl -u garmin-api -n 40" >&2
exit 1
