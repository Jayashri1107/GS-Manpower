#!/usr/bin/env bash
# Sets a new admin password on the server and prints it once. Keeps DATA_KEY, so stored data stays readable.
# Run on the SERVER:  sudo bash /opt/gs-manpower/deploy/reset-admin-password.sh
set -euo pipefail

APP=/opt/gs-manpower
ENV_FILE=/etc/gs-manpower.env

[[ $EUID -eq 0 ]] || { echo "Please run with sudo."; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "$ENV_FILE not found. Run the install script first."; exit 1; }

OUT="$(cd "$APP" && node scripts/setup.js --print)"
HASH_LINE="$(grep '^ADMIN_PASSWORD_HASH=' <<<"$OUT")"
PASSWORD="$(sed -n 's/^ *Password: //p' <<<"$OUT")"
[[ -n "$HASH_LINE" && -n "$PASSWORD" ]] || { echo "Could not create a password."; exit 1; }

TMP="$(mktemp)"
{ grep -v '^ADMIN_PASSWORD_HASH=' "$ENV_FILE"; echo "$HASH_LINE"; } > "$TMP"
cat "$TMP" > "$ENV_FILE"
rm -f "$TMP"
chmod 600 "$ENV_FILE"

systemctl restart gs-manpower

echo
echo "New admin login (shown only this once – save it in a password manager):"
echo "  Username: admin"
echo "  Password: $PASSWORD"
