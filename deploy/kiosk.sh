#!/usr/bin/env bash
# Launches the Garmin dashboard full-screen in Chromium as a kiosk and keeps the
# display awake. Started automatically on desktop login by kiosk_setup.sh; you
# can also run it directly to test. Override the URL with KIOSK_URL=...
set -u

URL="${KIOSK_URL:-http://localhost:8080}"

# --- Keep the display awake (best-effort). xset works on the X11 desktop; it's
# harmless (just no-ops with a warning) under Wayland — disable blanking there
# via the compositor, see deploy notes in README.md. ---
if command -v xset >/dev/null 2>&1 && [ -n "${DISPLAY:-}" ]; then
  xset s off        # no screensaver
  xset s noblank    # don't blank the video output
  xset -dpms        # no DPMS power-saving
fi

# Hide the mouse cursor when idle, if unclutter is installed.
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0 -root &
fi

# Whichever Chromium binary this image ships.
CHROME="$(command -v chromium-browser || command -v chromium || true)"
if [ -z "$CHROME" ]; then
  echo "kiosk.sh: chromium not found — install with: sudo apt install -y chromium-browser" >&2
  exit 1
fi

# Clear Chromium's "did not exit cleanly" flags so a power cut doesn't leave a
# restore-session bar on the screen.
PREFS="$HOME/.config/chromium/Default/Preferences"
if [ -f "$PREFS" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "$PREFS" 2>/dev/null || true
fi

# --kiosk = full-screen no chrome; --incognito avoids restore prompts; the update
# interval + flags suppress infobars/dialogs on the wall display.
exec "$CHROME" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --incognito \
  "$URL"
