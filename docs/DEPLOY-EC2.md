# Deploying GS Manpower on AWS EC2

One small Ubuntu server runs everything: the website (English + Marathi), the form API and the admin panel.

```
Visitor ──HTTPS──▶ Caddy (ports 80/443, automatic certificates) ──▶ Node app on 127.0.0.1:8080 ──▶ /var/lib/gs-manpower (encrypted data)
```

Files used from this repository: `deploy/gs-manpower.service` (systemd), `deploy/Caddyfile`, `deploy/gs-manpower.env.example`,
`deploy/update.sh`. Time needed: about 1 hour the first time.

---

## 1. Launch the EC2 instance (AWS console)

1. Region: **Asia Pacific (Mumbai) ap-south-1** (closest to your visitors).
2. EC2 → **Launch instance**:
   - Name: `gs-manpower`
   - Image: **Ubuntu Server 24.04 LTS** (64-bit x86)
   - Instance type: **t3.small** (2 GB RAM, recommended). `t3.micro` works for low traffic.
   - Key pair: **Create new key pair** → `gs-manpower-key`, type ED25519, format `.pem`. Download and keep it safe.
   - Network settings → **Create security group** `gs-manpower-sg` with these inbound rules:
     | Type | Port | Source |
     |---|---|---|
     | SSH | 22 | **My IP** (not 0.0.0.0/0) |
     | HTTP | 80 | Anywhere (0.0.0.0/0 and ::/0) – needed for the certificate |
     | HTTPS | 443 | Anywhere (0.0.0.0/0 and ::/0) |
     Do **not** open port 8080; the app is only reachable through Caddy.
   - Storage: **20 GB gp3**, encrypted (tick "Encrypted").
3. Launch.
4. EC2 → **Elastic IPs** → **Allocate** → select it → **Associate** with the `gs-manpower` instance.
   Note this IP, e.g. `13.233.xx.xx`. (A fixed IP survives restarts; the default public IP does not.)

## 2. Point the domain at the server (GoDaddy)

GoDaddy → My Products → gsmanpower.in → **DNS**:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | your Elastic IP | 1 hour (or lowest) |
| CNAME | `www` | `gsmanpower.in` | 1 hour |

Delete any other `A` record for `@` (GoDaddy's "Parked") and turn off Forwarding. Do not touch MX/TXT records.
Check from your computer after a few minutes: `nslookup www.gsmanpower.in` should show your Elastic IP.

## 3. Connect to the server

Windows PowerShell (in the folder with the key):
```
ssh -i gs-manpower-key.pem ubuntu@YOUR_ELASTIC_IP
```
All following commands run **on the server**.

## Shortcut: steps 4 to 8 with one command

On a fresh Ubuntu 24.04 server this does steps 4–8 in the right order, including creating the data folder and secrets:
```bash
curl -fsSL https://raw.githubusercontent.com/Jayashri1107/GS-Manpower/main/deploy/install.sh -o install.sh
sudo bash install.sh
```
It prints the admin password once at the end. Safe to run again: it never replaces `/etc/gs-manpower.env` or stored data.
Then continue at step 9. The manual steps below show what it does.

**Data storage:** the app has no separate database server. Enquiries, applications, resumes, admin settings and the
activity log are stored as encrypted files in `/var/lib/gs-manpower`, created by the install. Back it up as in step 11.

## 4. Install Node.js 22, Git and Caddy

```bash
sudo apt update && sudo apt -y upgrade
sudo apt install -y git curl ca-certificates gnupg unattended-upgrades

# Node.js 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version          # v22.x

# Caddy (official package)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 5. Create the app user, folders and get the code

```bash
sudo useradd --system --create-home --home-dir /home/gsm --shell /usr/sbin/nologin gsm
sudo mkdir -p /opt/gs-manpower /var/lib/gs-manpower
sudo chown gsm:gsm /opt/gs-manpower /var/lib/gs-manpower
sudo chmod 700 /var/lib/gs-manpower
```

**If the GitHub repository is public:**
```bash
sudo -u gsm git clone https://github.com/Jayashri1107/GS-Manpower.git /opt/gs-manpower
```

**If it is private:** create a read-only deploy key.
```bash
sudo -u gsm ssh-keygen -t ed25519 -N "" -f /home/gsm/.ssh/id_ed25519
sudo cat /home/gsm/.ssh/id_ed25519.pub
```
Copy the printed line → GitHub → repository → Settings → **Deploy keys** → Add (leave "Allow write access" unticked). Then:
```bash
sudo -u gsm ssh -o StrictHostKeyChecking=accept-new -T git@github.com   # "successfully authenticated" is fine
sudo -u gsm git clone git@github.com:Jayashri1107/GS-Manpower.git /opt/gs-manpower
```

Check the code works on this machine:
```bash
cd /opt/gs-manpower && sudo -u gsm node --test test/*.test.js     # expect: pass 16, fail 0
```

## 6. Secrets and settings

Generate the data key and admin password **on the server**:
```bash
cd /opt/gs-manpower && node scripts/setup.js --print
```
It prints `DATA_KEY=…`, `ADMIN_USER=admin`, `ADMIN_PASSWORD_HASH=…` and the **admin password**.
Save all of it in your password manager now. Without `DATA_KEY`, stored data can never be read.

Create the settings file:
```bash
sudo cp /opt/gs-manpower/deploy/gs-manpower.env.example /etc/gs-manpower.env
sudo chmod 600 /etc/gs-manpower.env
sudo nano /etc/gs-manpower.env
```
Paste the `DATA_KEY` and `ADMIN_PASSWORD_HASH` values (no spaces, no quotes), check `PUBLIC_URL`, add alert settings if
you have them. Save with Ctrl+O, Enter, Ctrl+X.

## 7. Start the app as a service

```bash
sudo cp /opt/gs-manpower/deploy/gs-manpower.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gs-manpower
sudo systemctl status gs-manpower --no-pager          # "active (running)"
curl http://127.0.0.1:8080/healthz                     # {"ok":true}
```
If it is not running: `sudo journalctl -u gs-manpower -n 50 --no-pager` shows why (most often a typo in `/etc/gs-manpower.env`).

## 8. Turn on HTTPS with Caddy

DNS from step 2 must already point at the server.
```bash
sudo cp /opt/gs-manpower/deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager             # look for "certificate obtained successfully"
```

## 9. Check the live site

From your own computer:
- https://www.gsmanpower.in – English site with a padlock
- https://gsmanpower.in – redirects to www
- https://www.gsmanpower.in/mr/ – Marathi site
- https://www.gsmanpower.in/admin – log in with `admin` and the password from step 6
- https://www.gsmanpower.in/healthz – `{"ok":true}`
- Send one test enquiry with made-up data → it appears in the admin panel → delete it.
- https://securityheaders.com → enter the address → expect grade A.

Then in **Admin → Website settings** enter the real phone, WhatsApp, address and registration numbers.

## 10. Updating the site later

After changes are pushed to GitHub `main`:
```bash
ssh -i gs-manpower-key.pem ubuntu@YOUR_ELASTIC_IP
sudo bash /opt/gs-manpower/deploy/update.sh
```
It pulls the code, runs the tests, restarts the app and checks it is up. Settings and stored data are not touched.

## 11. Backups

- EC2 → **Lifecycle Manager** (Data Lifecycle Manager) → create a policy: daily snapshot of the instance's volume,
  keep 7–14. This backs up `/var/lib/gs-manpower` (encrypted leads, admin settings, activity log).
- Keep `DATA_KEY` and `/etc/gs-manpower.env` contents in your password manager; a snapshot is useless without the key.

## 12. Useful commands

| What | Command |
|---|---|
| App logs (live) | `sudo journalctl -u gs-manpower -f` |
| Restart app | `sudo systemctl restart gs-manpower` |
| HTTPS / Caddy logs | `sudo journalctl -u caddy -f` and `/var/log/caddy/gs-manpower.log` |
| Change admin password | `cd /opt/gs-manpower && node scripts/setup.js --print` → copy **only** the new `ADMIN_PASSWORD_HASH` into `/etc/gs-manpower.env` (keep `DATA_KEY`) → `sudo systemctl restart gs-manpower` |
| Disk space | `df -h /` |

## Security checklist

- [ ] SSH (port 22) open only to your IP; key file never shared
- [ ] Port 8080 not open in the security group (the app listens on 127.0.0.1 only: `HOST=127.0.0.1`)
- [ ] `/etc/gs-manpower.env` is mode 600; `/var/lib/gs-manpower` is mode 700 and owned by `gsm`
- [ ] Root volume encrypted; daily snapshots on
- [ ] Unattended security upgrades on
- [ ] AWS account has MFA on the root user, and a billing alarm
