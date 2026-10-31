#!/usr/bin/env bash
# Pull the latest code from GitHub and restart the app. Run on the server:  sudo bash /opt/gs-manpower/deploy/update.sh
set -euo pipefail
cd /opt/gs-manpower
sudo -u gsm git pull --ff-only
sudo -u gsm node --test test/*.test.js
systemctl restart gs-manpower
sleep 2
curl -fsS http://127.0.0.1:8080/healthz && echo "  <- app is up"
