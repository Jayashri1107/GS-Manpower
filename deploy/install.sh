#!/usr/bin/env bash
# One-command install on a fresh Ubuntu 24.04 server (AWS EC2). Run on the SERVER, not on Windows:
#   curl -fsSL https://raw.githubusercontent.com/Jayashri1107/GS-Manpower/main/deploy/install.sh -o install.sh
#   sudo bash install.sh
# Safe to run again: it never replaces an existing /etc/gs-manpower.env (the DATA_KEY must not change) and never
# touches the stored data in /var/lib/gs-manpower.
set -euo pipefail

REPO="https://github.com/Jayashri1107/GS-Manpower.git"
APP=/opt/gs-manpower
DATA=/var/lib/gs-manpower
ENV_FILE=/etc/gs-manpower.env
DOMAIN=www.gsmanpower.in

[[ $EUID -eq 0 ]] || { echo "Please run with sudo: sudo bash install.sh"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
step() { echo; echo "=== $* ==="; }

step "1/8 System packages and automatic security updates"
apt-get update -y
apt-get install -y git curl ca-certificates gnupg unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades

step "2/8 Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node --version

step "3/8 Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

step "4/8 App user, code and data folder"
id gsm >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/gsm --shell /usr/sbin/nologin gsm
mkdir -p "$APP" "$DATA"
chown gsm:gsm "$APP" "$DATA"
chmod 700 "$DATA"
if [[ -d "$APP/.git" ]]; then
  sudo -H -u gsm git -C "$APP" pull --ff-only
else
  sudo -H -u gsm git clone "$REPO" "$APP"
fi

step "5/8 Automatic tests"
(cd "$APP" && sudo -H -u gsm bash -c 'node --test test/*.test.js' | tail -8)

step "6/8 Secrets"
NEW_PASSWORD=""
if [[ -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE already exists; keeping it (the data key and admin password are unchanged)."
else
  OUT="$(cd "$APP" && node scripts/setup.js --print)"
  KEY_LINE="$(grep '^DATA_KEY=' <<<"$OUT")"
  HASH_LINE="$(grep '^ADMIN_PASSWORD_HASH=' <<<"$OUT")"
  NEW_PASSWORD="$(sed -n 's/^ *Password: //p' <<<"$OUT")"
  [[ -n "$KEY_LINE" && -n "$HASH_LINE" && -n "$NEW_PASSWORD" ]] || { echo "Could not create secrets"; exit 1; }
  umask 077
  { grep -vE '^(DATA_KEY|ADMIN_PASSWORD_HASH)=' "$APP/deploy/gs-manpower.env.example"; echo "$KEY_LINE"; echo "$HASH_LINE"; } > "$ENV_FILE"
  umask 022
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

step "7/8 Start the app"
cp "$APP/deploy/gs-manpower.service" /etc/systemd/system/gs-manpower.service
systemctl daemon-reload
systemctl enable gs-manpower >/dev/null
systemctl restart gs-manpower
for _ in $(seq 1 15); do
  curl -fsS http://127.0.0.1:8080/healthz >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -fsS http://127.0.0.1:8080/healthz >/dev/null; then
  echo "The app did not start. Last log lines:"
  journalctl -u gs-manpower -n 30 --no-pager
  exit 1
fi
echo "App is running."

step "8/8 HTTPS with Caddy"
cp "$APP/deploy/Caddyfile" /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl enable caddy >/dev/null
systemctl reload caddy || systemctl restart caddy

MY_IP="$(curl -fsS https://checkip.amazonaws.com || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"

echo
echo "=================================================================="
echo " Done. The server is set up."
if [[ -n "$NEW_PASSWORD" ]]; then
  echo
  echo " ADMIN LOGIN  (shown only this once – save it in a password manager)"
  echo "   Username: admin"
  echo "   Password: $NEW_PASSWORD"
  echo
  echo " Also copy the whole of $ENV_FILE into your password manager:"
  echo "   sudo cat $ENV_FILE"
  echo " Without its DATA_KEY, stored enquiries can never be read."
fi
echo
if [[ -n "$MY_IP" && "$DNS_IP" == "$MY_IP" ]]; then
  echo " DNS is correct. Open https://$DOMAIN and https://$DOMAIN/admin"
else
  echo " DNS is NOT pointing here yet: $DOMAIN -> ${DNS_IP:-nothing}, this server -> ${MY_IP:-unknown}"
  echo " Set GoDaddy DNS:  A  @  $MY_IP   and   CNAME  www  gsmanpower.in"
  echo " Caddy keeps retrying and gets the HTTPS certificate on its own once DNS is right."
fi
echo "=================================================================="
