#!/usr/bin/env bash
# Makes the dashboard launch full-screen on desktop login by installing an XDG
# autostart entry that runs kiosk.sh. The ~/.config/autostart/*.desktop mechanism
# is honored by both the X11 (LXDE) and Wayland (labwc/wayfire) Raspberry Pi OS
# desktops, so this works across Pi OS versions.
#
# One-time prerequisites:
#   1. Desktop autologin:  sudo raspi-config  ->  System Options
#         ->  Boot / Auto Login  ->  "Desktop Autologin"
#   2. Packages:  sudo apt install -y chromium-browser unclutter
#
# Run from the deploy/ directory:  bash kiosk_setup.sh
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIOSK_SH="$DEPLOY_DIR/kiosk.sh"
chmod +x "$KIOSK_SH"

AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
DESKTOP="$AUTOSTART_DIR/garmin-kiosk.desktop"

cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=Garmin Dashboard Kiosk
Comment=Full-screen the run dashboard on login
Exec=$KIOSK_SH
X-GNOME-Autostart-enabled=true
EOF

echo "Installed autostart entry: $DESKTOP"
echo "  runs: $KIOSK_SH  (URL: \${KIOSK_URL:-http://localhost:8080})"
echo
echo "Reboot to start the kiosk, or run '$KIOSK_SH' now to test it."
