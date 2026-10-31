// Builds the website from /src into /site. No dependencies: `node build.js`
//
// - src/layout.html        page shell (head, header, footer)
// - src/pages/*.html       one file per page; first line is <!--meta {json} -->
// - src/partials/*.html    reusable pieces, included with {{> name}}
// - src/content/site.json  contact details, endpoints, feature flags (edit this, not the pages)
// - <!-- if:flag --> ... <!-- endif:flag -->  is kept only when features[flag] is true
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'site');
const config = JSON.parse(fs.readFileSync(path.join(SRC, 'content', 'site.json'), 'utf8'));
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

function includePartials(html, depth = 0) {
  if (depth > 5) throw new Error('Partials nested too deeply');
  const out = html.replace(/{{>\s*([\w-]+)\s*}}/g, (_, name) => read('partials', `${name}.html`));
  return out === html ? out : includePartials(out, depth + 1);
}

function applyConditionals(html) {
  return html.replace(/<!-- if:(\w+) -->([\s\S]*?)<!-- endif:\1 -->/g, (_, flag, body) =>
    config.features && config.features[flag] ? body : '');
}

function fillVars(html, vars) {
  return html.replace(/{{\s*([\w]+)\s*}}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'));
for (const f of fs.readdirSync(path.join(SRC, 'static'))) {
  fs.copyFileSync(path.join(SRC, 'static', f), path.join(OUT, f));
}

// Public config for the browser (no secrets belong in site.json).
const publicConfig = {
  whatsapp: config.whatsapp,
  ga4Id: config.ga4Id,
  phoneDisplay: config.phoneDisplay,
};
fs.writeFileSync(path.join(OUT, 'assets', 'js', 'config.js'),
  `window.GSMS_CONFIG = ${JSON.stringify(publicConfig)};\n`);

const layout = read('layout.html');
const sitemap = [];

for (const file of fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.html'))) {
  const raw = read('pages', file);
  const match = raw.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!match) throw new Error(`${file}: missing <!--meta {...} --> header`);
  const meta = JSON.parse(match[1]);
  const content = raw.slice(match[0].length);
  const outName = file;
  const canonical = `${config.baseUrl}/${outName === 'index.html' ? '' : outName}`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'EmploymentAgency',
    name: config.siteName,
    url: config.baseUrl,
    telephone: config.phoneE164,
    email: config.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Chhatrapati Sambhajinagar',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    areaServed: 'Chhatrapati Sambhajinagar, Maharashtra',
  };

  let html = layout.replace('{{content}}', content);
  html = includePartials(html);
  html = applyConditionals(html);
  html = fillVars(html, {
    ...config,
    ...meta,
    canonical,
    jsonld: JSON.stringify(jsonld),
    robots: meta.noindex ? '<meta name="robots" content="noindex">' : '',
  });
  // Mark the current page in the main navigation.
  html = html.replace(new RegExp(`data-page="${meta.slug}"`, 'g'), `data-page="${meta.slug}" aria-current="page"`);

  const leftover = html.match(/{{[^}]*}}/);
  if (leftover) throw new Error(`${file}: unfilled placeholder ${leftover[0]}`);

  fs.writeFileSync(path.join(OUT, outName), html);
  if (!meta.noindex) sitemap.push(canonical);
}

fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /components.html\nSitemap: ${config.baseUrl}/sitemap.xml\n`);

console.log(`Built ${sitemap.length} indexed pages into /site`);
