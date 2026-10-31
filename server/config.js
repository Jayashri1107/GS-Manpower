// Runtime configuration from environment variables (and a local .env file in development).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

// Minimal .env loader: KEY=value lines, # comments. Real environment variables win.
function loadDotEnv(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

function getConfig() {
  loadDotEnv();
  const env = process.env;
  const production = env.NODE_ENV === 'production';
  const dataDir = path.resolve(env.DATA_DIR || path.join(ROOT, 'data'));

  let dataKey = env.DATA_KEY ? Buffer.from(env.DATA_KEY, 'base64') : null;
  if (dataKey && dataKey.length !== 32) throw new Error('DATA_KEY must be 32 bytes, base64 encoded. Run: npm run setup');
  if (!dataKey) {
    if (production) throw new Error('DATA_KEY is not set. Run `npm run setup` locally to generate one, then add it to the host.');
    // Development only: a fixed key derived from the folder, so local test data survives restarts.
    dataKey = crypto.createHash('sha256').update('gsm-dev-only:' + ROOT).digest();
    console.warn('! DATA_KEY not set – using a development-only key. Never use this in production.');
  }
  if (production && !env.ADMIN_PASSWORD_HASH) throw new Error('ADMIN_PASSWORD_HASH is not set. Run `npm run setup`.');

  return {
    production,
    port: Number(env.PORT || 4173),
    host: env.HOST || undefined, // e.g. 127.0.0.1 behind Caddy or Nginx; empty = all interfaces
    dataDir,
    dataKey,
    contentFile: path.join(dataDir, 'content.json'),
    adminUser: env.ADMIN_USER || 'admin',
    adminPasswordHash: env.ADMIN_PASSWORD_HASH || '',
    trustProxy: env.TRUST_PROXY === '1' || production,
    publicUrl: (env.PUBLIC_URL || '').replace(/\/$/, ''),
    retention: { enquiryDays: Number(env.RETAIN_ENQUIRY_DAYS || 730), applicationDays: Number(env.RETAIN_APPLICATION_DAYS || 365) },
    notify: {
      resendKey: env.RESEND_API_KEY || '',
      emailFrom: env.NOTIFY_EMAIL_FROM || '',
      emailTo: (env.NOTIFY_EMAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean),
      webhookUrl: env.NOTIFY_WEBHOOK_URL || '',
      waToken: env.WHATSAPP_TOKEN || '',
      waPhoneId: env.WHATSAPP_PHONE_NUMBER_ID || '',
      waTo: (env.WHATSAPP_NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean),
      waTemplate: env.WHATSAPP_TEMPLATE || 'new_lead_alert',
      waLang: env.WHATSAPP_TEMPLATE_LANG || 'en',
    },
  };
}

module.exports = { getConfig, loadDotEnv, ROOT };
