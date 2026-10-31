// Lead notifications. Any channel that is configured is used; none are required.
// Messages never contain the applicant's or contact's personal details – only what kind of lead it is and a
// link to the admin panel, where the record is shown after login.
//   Email     RESEND_API_KEY + NOTIFY_EMAIL_FROM + NOTIFY_EMAIL_TO       (https://resend.com)
//   Webhook   NOTIFY_WEBHOOK_URL  (Slack, Google Chat, Microsoft Teams or any JSON webhook: {"text": "..."})
//   WhatsApp  WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_NOTIFY_TO (+ approved template WHATSAPP_TEMPLATE
//             with one body parameter)  – WhatsApp Business Cloud API

function summary(lead) {
  if (lead.type === 'enquiry') return `New manpower enquiry: ${lead.worker_count} × ${lead.role}, ${lead.timeline}.`;
  return `New job application: ${lead.role}, ${lead.experience}.`;
}

async function post(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
}

async function notifyLead(cfg, lead, adminUrl) {
  const n = cfg.notify;
  const text = `${summary(lead)} Open the admin panel to view it: ${adminUrl}`;
  const jobs = [];

  if (n.resendKey && n.emailFrom && n.emailTo.length) {
    jobs.push(['email', post('https://api.resend.com/emails', {
      from: n.emailFrom,
      to: n.emailTo,
      subject: summary(lead),
      text: `${text}\n\nPersonal details are not included in this email for privacy. Log in to see them.\n\nGS Manpower website`,
    }, { Authorization: `Bearer ${n.resendKey}` })]);
  }
  if (n.webhookUrl) jobs.push(['webhook', post(n.webhookUrl, { text })]);
  if (n.waToken && n.waPhoneId && n.waTo.length) {
    for (const to of n.waTo) {
      jobs.push(['whatsapp', post(`https://graph.facebook.com/v20.0/${n.waPhoneId}/messages`, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: n.waTemplate, language: { code: n.waLang }, components: [{ type: 'body', parameters: [{ type: 'text', text: summary(lead) }] }] },
      }, { Authorization: `Bearer ${n.waToken}` })]);
    }
  }

  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  return results.map((r, i) => ({ channel: jobs[i][0], ok: r.status === 'fulfilled', error: r.reason ? String(r.reason.message || r.reason) : undefined }));
}

module.exports = { notifyLead, summary };
