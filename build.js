// Builds the website from /src into /site. No dependencies: `node build.js`
//
// - src/layout.html          page shell (head, header, footer)
// - src/pages/*.html         English pages; first line is <!--meta {json} -->
// - src/pages/mr/*.html      Marathi pages, built into /site/mr/
// - src/partials/*.html      reusable pieces, included with {{> name}}; name.mr.html is used on Marathi pages
// - src/content/site.json    contact details, registrations, endpoints, feature flags
// - CONTENT_FILE (env)       optional JSON written by the admin panel; overrides site.json values
// - <!-- if:flag --> ... <!-- endif:flag -->  is kept only when features[flag] is true
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const SITE = path.join(__dirname, 'site');
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

function loadConfig() {
  const base = JSON.parse(read('content', 'site.json'));
  const file = process.env.CONTENT_FILE;
  if (file && fs.existsSync(file)) {
    const override = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...base, ...override, features: { ...base.features, ...(override.features || {}) } };
  }
  return base;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function build() {
  const config = loadConfig();
  // Build into a temporary folder and swap it in at the end, so a running server never serves a half-built site.
  const OUT = `${SITE}.building-${process.pid}`;
  cleanLeftovers();
  fs.rmSync(OUT, { recursive: true, force: true });

  function includePartials(html, lang, depth = 0) {
    if (depth > 5) throw new Error('Partials nested too deeply');
    const out = html.replace(/{{>\s*([\w-]+)\s*}}/g, (_, name) => {
      const localised = path.join(SRC, 'partials', `${name}.${lang}.html`);
      return lang !== 'en' && fs.existsSync(localised) ? fs.readFileSync(localised, 'utf8') : read('partials', `${name}.html`);
    });
    return out === html ? out : includePartials(out, lang, depth + 1);
  }

  const applyConditionals = (html) => html.replace(/<!-- if:(\w+) -->([\s\S]*?)<!-- endif:\1 -->/g,
    (_, flag, body) => (config.features && config.features[flag] ? body : ''));

  // Values from site.json / the admin panel are escaped; page meta and generated values are trusted.
  function fillVars(html, safe, raw) {
    return html.replace(/{{\s*([\w]+)\s*}}/g, (m, key) => {
      if (key in raw) return String(raw[key]);
      if (key in safe) return escapeHtml(safe[key]);
      return m;
    });
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'));
  fs.copyFileSync(path.join(SRC, 'assets', 'img', 'favicon.ico'), path.join(OUT, 'favicon.ico'));

  fs.writeFileSync(path.join(OUT, 'assets', 'js', 'config.js'),
    `window.GSMS_CONFIG = ${JSON.stringify({ whatsapp: config.whatsapp, ga4Id: config.ga4Id, phoneDisplay: config.phoneDisplay })};\n`);

  const layout = read('layout.html');
  const languages = [
    { lang: 'en', dir: '', htmlLang: 'en-IN', ogLocale: 'en_IN' },
    { lang: 'mr', dir: 'mr', htmlLang: 'mr-IN', ogLocale: 'mr_IN' },
  ];
  const pagesOf = (dir) => {
    const p = path.join(SRC, 'pages', dir);
    return fs.existsSync(p) ? fs.readdirSync(p).filter((f) => f.endsWith('.html')) : [];
  };
  const available = { en: pagesOf(''), mr: pagesOf('mr') };
  const urlFor = (lang, file) => `${config.baseUrl}/${lang === 'en' ? '' : 'mr/'}${file === 'index.html' ? '' : file}`;
  const sitemap = [];

  for (const L of languages) {
    const other = L.lang === 'en' ? 'mr' : 'en';
    fs.mkdirSync(path.join(OUT, L.dir), { recursive: true });

    for (const file of available[L.lang]) {
      const raw = read('pages', L.dir, file);
      const match = raw.match(/^<!--meta\s*([\s\S]*?)-->/);
      if (!match) throw new Error(`${L.dir}/${file}: missing <!--meta {...} --> header`);
      const meta = JSON.parse(match[1]);
      const content = raw.slice(match[0].length);
      const canonical = urlFor(L.lang, file);
      const hasTwin = available[other].includes(file);
      const altFile = hasTwin ? file : 'index.html';
      const altHref = L.lang === 'en' ? `mr/${altFile}` : `../${altFile}`;
      const hreflang = hasTwin && !meta.noindex
        ? `<link rel="alternate" hreflang="en-IN" href="${urlFor('en', file)}">\n  <link rel="alternate" hreflang="mr-IN" href="${urlFor('mr', file)}">\n  <link rel="alternate" hreflang="x-default" href="${urlFor('en', file)}">`
        : `<link rel="alternate" hreflang="${L.htmlLang}" href="${canonical}">`;

      const jsonld = {
        '@context': 'https://schema.org',
        '@type': 'EmploymentAgency',
        name: config.siteName,
        slogan: 'Right people. Right shift.',
        url: config.baseUrl,
        logo: `${config.baseUrl}/assets/img/gs-mark.svg`,
        telephone: config.phoneE164,
        email: config.email,
        address: { '@type': 'PostalAddress', streetAddress: config.addressLine, addressLocality: 'Chhatrapati Sambhajinagar', addressRegion: 'Maharashtra', addressCountry: 'IN' },
        areaServed: 'Chhatrapati Sambhajinagar, Maharashtra',
      };

      let html = layout.replace('{{content}}', content);
      html = includePartials(html, L.lang);
      html = applyConditionals(html);
      const { features, ...settings } = config;
      html = fillVars(html, settings, {
        ...meta,
        canonical,
        htmlLang: L.htmlLang,
        ogLocale: L.ogLocale,
        hreflang,
        altHref,
        jsonld: JSON.stringify(jsonld).replace(/</g, '\\u003c'),
        robots: meta.noindex ? '<meta name="robots" content="noindex">' : '',
      });
      html = html.replace(new RegExp(`data-page="${meta.slug}"`, 'g'), `data-page="${meta.slug}" aria-current="page"`);
      if (L.dir) html = html.replace(/(src|href)="assets\//g, '$1="../assets/');

      const leftover = html.match(/{{[^}]*}}/);
      if (leftover) throw new Error(`${L.dir}/${file}: unfilled placeholder ${leftover[0]}`);

      fs.writeFileSync(path.join(OUT, L.dir, file), html);
      if (!meta.noindex) sitemap.push(canonical);
    }
  }

  fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
  fs.writeFileSync(path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /components.html\nDisallow: /admin\nDisallow: /api/\nSitemap: ${config.baseUrl}/sitemap.xml\n`);

  swapIn(OUT);
  return sitemap.length;
}

// Windows can briefly lock folders a running server is reading. Retry the rename a few times, then fall back to
// copying the finished build over the old one, so a build never fails or leaves the site missing.
function swapIn(OUT) {
  const old = `${SITE}.old-${process.pid}`;
  const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (fs.existsSync(SITE)) fs.renameSync(SITE, old);
      fs.renameSync(OUT, SITE);
      fs.rmSync(old, { recursive: true, force: true });
      return;
    } catch {
      if (!fs.existsSync(SITE) && fs.existsSync(old)) fs.renameSync(old, SITE); // put the previous site back
      pause(100 * (attempt + 1));
    }
  }
  fs.mkdirSync(SITE, { recursive: true });
  copyDir(OUT, SITE);
  fs.rmSync(OUT, { recursive: true, force: true });
}

// Remove temporary folders left behind by an interrupted build.
function cleanLeftovers() {
  for (const name of fs.readdirSync(__dirname)) {
    if (/^site\.(building|old)-\d+$/.test(name) && !name.endsWith(`-${process.pid}`)) {
      try { fs.rmSync(path.join(__dirname, name), { recursive: true, force: true }); } catch { /* still in use; next build */ }
    }
  }
}

module.exports = { build, loadConfig };

if (require.main === module) {
  console.log(`Built ${build()} indexed pages into /site`);
}
