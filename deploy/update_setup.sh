#!/usr/bin/env bash
# Installs the daily self-update timer: at 04:30 the Pi pulls origin/main,
# rebuilds, restarts, health-checks, and rolls back if the new code doesn't come
# up (see update.sh). The kiosk reloads itself into the new bundle within ~5 min
# (useVersionCheck.js).
#
# Run as your normal user (it sudo's on its own):  bash deploy/update_setup.sh
#
# This also grants ONE narrow passwordless sudo right — restarting garmin-api —
# because the timer runs unattended as you and cannot type a password. It is
# scoped to that single systemctl command, nothing else.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
RUN_USER="${SUDO_USER:-$USER}"

if [ "$(id -u)" -eq 0 ] && [ -z "${SUDO_USER:-}" ]; then
  echo "update_setup.sh: run as your normal user (it sudo's on its own), not as root." >&2
  exit 1
fi

chmod +x "$DEPLOY_DIR/update.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

sed -e "s|@REPO_DIR@|$REPO_DIR|g" -e "s|@USER@|$RUN_USER|g" \
  "$DEPLOY_DIR/garmin-update.service.template" > "$TMP/garmin-update.service"

# systemctl is the only thing update.sh can't do as an unprivileged user.
SUDOERS="/etc/sudoers.d/garmin-update"
SUDO_LINE="$RUN_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart garmin-api, /bin/systemctl restart garmin-api"
echo "$SUDO_LINE" | sudo tee "$SUDOERS" > /dev/null
sudo chmod 440 "$SUDOERS"
sudo visudo -cf "$SUDOERS"   # refuse to leave a broken sudoers file behind

sudo install -m 644 "$TMP/garmin-update.service" /etc/systemd/system/garmin-update.service
sudo install -m 644 "$DEPLOY_DIR/garmin-update.timer" /etc/systemd/system/garmin-update.timer
sudo systemctl daemon-reload
sudo systemctl enable --now garmin-update.timer

echo
echo "Daily self-update installed. Next run:"
systemctl list-timers garmin-update.timer --no-pager | sed -n '1,2p'
echo
echo "Upgrade right now:      bash $DEPLOY_DIR/update.sh"
echo "Watch what it did:      journalctl -u garmin-update -n 50"
