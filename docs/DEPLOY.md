# Putting GS Manpower online

The website, the two forms and the admin panel run as **one Node.js app**. It needs a host that can run
Node 20+ and that gives it a **persistent disk** (the encrypted form submissions are stored there).
Two tested options are described: **Render** (easiest) and **any server with Docker**.

Time needed: about 45 minutes the first time. Cost: a paid Render web service (Starter) plus a 1 GB disk – the free
plan has no persistent disk, so submissions would be lost. Check current prices at render.com/pricing.

---

## Step 1 – Create the secrets (on your computer, once)

1. Open PowerShell in `C:\GS-Manpower`.
2. Run:
   ```
   npm run setup -- --print
   ```
3. It prints three lines – `DATA_KEY=…`, `ADMIN_USER=admin`, `ADMIN_PASSWORD_HASH=…` – and an **admin password**.
4. Save all of it in a password manager (for example Bitwarden or 1Password). Do **not** email it or put it in GitHub.
   - Without `DATA_KEY`, stored enquiries and applications can never be read again.
   - The admin password is shown only once.

## Step 2 – Create the Render service

1. Sign in at https://render.com with the GitHub account that owns `Jayashri1107/GS-Manpower`.
2. Click **New → Blueprint**, choose the `GS-Manpower` repository, and click **Apply**.
   Render reads `render.yaml` and creates a web service called `gs-manpower` with a 1 GB disk at `/var/data`.
3. When it asks for the values marked "sync: false", enter:
   | Name | Value |
   |---|---|
   | `DATA_KEY` | from Step 1 |
   | `ADMIN_PASSWORD_HASH` | from Step 1 |
   | `PUBLIC_URL` | `https://www.gsmanpower.in` (or the Render address until the domain is connected) |
   | `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, `NOTIFY_EMAIL_TO` | see Step 4 (can be left empty for now) |
   | `NOTIFY_WEBHOOK_URL` | optional, see Step 4 |
4. Wait for the first deploy to finish (green "Live"). Open the `…onrender.com` address it shows.
5. Check: home page loads, `/mr/` loads, `/admin` shows the login, and `/healthz` shows `{"ok":true}`.

## Step 3 – Connect the domain and HTTPS

1. In Render: service → **Settings → Custom Domains → Add** `www.gsmanpower.in` and `gsmanpower.in`.
2. Render shows DNS records. At your domain registrar (where gsmanpower.in was bought) add exactly those records
   (usually a `CNAME` for `www` and an `A`/`ALIAS` for the bare domain).
3. Wait until Render shows **Verified** and **Certificate issued** (minutes to a few hours). HTTPS is automatic and renews itself.
4. Set `PUBLIC_URL` to `https://www.gsmanpower.in` if you used the Render address before.

## Step 4 – Lead notifications (choose one or more)

Notifications never contain the person's details – only "New manpower enquiry: 12 × GDA…" and a link to `/admin`.

**Email (recommended):**
1. Create a free account at https://resend.com, add the domain `gsmanpower.in` and add the DNS records Resend shows.
2. Create an API key. In Render set:
   `RESEND_API_KEY` = the key · `NOTIFY_EMAIL_FROM` = `GS Manpower Website <website@gsmanpower.in>` ·
   `NOTIFY_EMAIL_TO` = the inbox(es) to alert, comma separated.

**Slack / Google Chat / Microsoft Teams:** create an "incoming webhook" in that tool and put its URL in `NOTIFY_WEBHOOK_URL`.

**WhatsApp:** needs a WhatsApp Business Cloud API account (Meta Business Manager) and an approved message template named
`new_lead_alert` with one body variable, e.g. "{{1}} Please check the admin panel." Then set `WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NOTIFY_TO` (e.g. `919876543210`).

Test: submit a sample enquiry on the live site with made-up details and check the alert arrives.

## Step 5 – Fill in the real details (no code)

1. Open `https://www.gsmanpower.in/admin` and log in (`admin` + the password from Step 1).
2. **Website settings** tab: enter phone, WhatsApp, email, address, office hours (English and Marathi) and the
   registration numbers. Fields with a yellow border still contain placeholders. Click **Save and publish**.
3. Only switch on **Show security services** after the PSARA licence is granted.
4. To add Google Analytics, create a GA4 property and paste its `G-…` ID; the cookie banner then appears automatically.

## Step 6 – Before announcing the site

- Work through `TESTING.md` on the live address.
- Have the privacy notice reviewed by a legal adviser and the Marathi/Hindi copy by native speakers.
- Submit `https://www.gsmanpower.in/sitemap.xml` in Google Search Console and create the Google Business Profile.
- Delete the sample records you created while testing (admin panel → record → **Delete permanently**).

---

## Alternative: your own server with Docker

```
docker build -t gs-manpower .
docker run -d --name gs-manpower --restart unless-stopped -p 8080:8080 \
  -v gsm-data:/data --env-file .env.production gs-manpower
```

`.env.production` holds the values from `.env.example` (with `DATA_DIR=/data`). Put Nginx or Caddy in front for HTTPS
(Caddy does certificates automatically) and keep `TRUST_PROXY=1`. Back up the `gsm-data` volume.

## Backups

The disk holds `leads/` (encrypted), `content.json` (settings from the admin panel) and `audit.log`.
On Render: enable disk snapshots (Settings → Disks). Keep `DATA_KEY` with the backups' owner – a backup is useless without it.

## Updating the site

Push changes to the `main` branch on GitHub. Render rebuilds and redeploys automatically (`autoDeploy: true`).
GitHub runs the tests on every push (`.github/workflows/ci.yml`); fix any red ✗ before relying on the deploy.

## Changing the admin password

```
npm run setup -- --print
```
Copy only the new `ADMIN_PASSWORD_HASH` to Render (keep the existing `DATA_KEY`!), then redeploy.
