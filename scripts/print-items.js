// Generates the print and social items from Brand Guidelines p.10 into /print.
//   Visiting card 90 × 50 mm (front, back) · Staff ID CR80 vertical 54 × 85.6 mm (GS Care, GS Industrial)
//   WhatsApp / Instagram recruitment post 1080 × 1080 (Marathi first)
// Fill the [PLACEHOLDERS] per person, then send the SVG to the printer (ask them to outline fonts and proof).
// Run: node scripts/print-items.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'print');
const C = { navy: '#14213D', saffron: '#F2A007', paper: '#F6F4EF', steel: '#5B6477', steelLight: '#C9CDD6', teal: '#0E7C70', white: '#FFFFFF' };
const FONTS = `<style>@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&amp;family=Manrope:wght@400;600;700&amp;family=Mukta:wght@600;800&amp;display=swap');
</style>`;

// The G Guardian mark at (x, y), `s` = size of the 48-unit box.
const mark = (x, y, s, g = C.navy) => `<g transform="translate(${x} ${y}) scale(${s / 48})">` +
  `<path d="M33.64 12.51A15 15 0 1 0 39 24H31" fill="none" stroke="${g}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<circle cx="22.5" cy="16.5" r="3.3" fill="${C.saffron}"/><path d="M22.5 23.6V27.6" stroke="${C.saffron}" stroke-width="6.4" stroke-linecap="round"/></g>`;
const mm = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>${title}</title>${FONTS}${body}</svg>\n`;

const items = {
  // Visiting card front: primary horizontal lockup, tagline.
  'visiting-card-front.svg': mm(90, 50, [
    `<rect width="90" height="50" fill="${C.white}"/>`,
    mark(8, 13, 18),
    `<text x="28" y="23" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="7.2" fill="${C.navy}">GS MANPOWER</text>`,
    `<text x="28.2" y="27.2" font-family="Manrope, Arial, sans-serif" font-size="1.9" font-weight="700" letter-spacing=".32" fill="${C.steel}">STAFFING · HEALTHCARE · INDUSTRY</text>`,
    `<rect x="10" y="38" width="12" height="1.2" rx=".6" fill="${C.saffron}"/>`,
    `<text x="10" y="44" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="3.4" fill="${C.navy}">Right people. Right shift.</text>`,
  ].join(''), 'GS Manpower visiting card – front'),

  // Visiting card back: person and contact details (navy, reversed mark).
  'visiting-card-back.svg': mm(90, 50, [
    `<rect width="90" height="50" fill="${C.navy}"/>`,
    mark(70, 6, 14, C.white),
    `<text x="8" y="14" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="4.6" fill="${C.white}">[YOUR NAME]</text>`,
    `<text x="8" y="19" font-family="Manrope, Arial, sans-serif" font-size="2.4" font-weight="600" fill="${C.steelLight}">Founder &amp; Director</text>`,
    `<rect x="8" y="23" width="10" height=".8" rx=".4" fill="${C.saffron}"/>`,
    `<text x="8" y="31" font-family="Manrope, Arial, sans-serif" font-size="2.5" fill="${C.white}">+91 [PHONE]</text>`,
    `<text x="8" y="35.5" font-family="Manrope, Arial, sans-serif" font-size="2.5" fill="${C.white}">[EMAIL]@gsmanpower.in</text>`,
    `<text x="8" y="40" font-family="Manrope, Arial, sans-serif" font-size="2.5" fill="${C.white}">www.gsmanpower.in</text>`,
    `<text x="8" y="44.5" font-family="Manrope, Arial, sans-serif" font-size="2.2" fill="${C.steelLight}">[ADDRESS], Chhatrapati Sambhajinagar</text>`,
  ].join(''), 'GS Manpower visiting card – back'),
};

// Staff ID cards, CR80 vertical. Division colour on the G and the header band.
for (const [file, division, color, role, prefix] of [
  ['staff-id-care.svg', 'GS CARE', C.teal, 'GNM Nurse · Night shift', 'GS-C'],
  ['staff-id-industrial.svg', 'GS INDUSTRIAL', C.navy, 'Machine operator · Day shift', 'GS-I'],
]) {
  items[file] = mm(54, 85.6, [
    `<rect width="54" height="85.6" rx="3" fill="${C.white}"/>`,
    `<path d="M0 3a3 3 0 0 1 3-3h48a3 3 0 0 1 3 3v19H0z" fill="${color}"/>`,
    `<rect x="22" y="2.5" width="10" height="2.2" rx="1.1" fill="${C.white}" opacity=".9"/>`,
    mark(5, 7, 11, C.white),
    `<text x="17" y="13.4" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="4.4" fill="${C.white}">${division}</text>`,
    `<text x="17.1" y="16.6" font-family="Manrope, Arial, sans-serif" font-size="1.55" font-weight="700" letter-spacing=".25" fill="${C.white}" opacity=".85">A GS MANPOWER DIVISION</text>`,
    `<text x="27" y="27" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="2" font-weight="700" letter-spacing=".32" fill="${C.steel}">STAFF ID</text>`,
    `<rect x="15" y="29" width="24" height="28" rx="1.5" fill="${C.paper}" stroke="${C.steelLight}" stroke-width=".3"/>`,
    `<text x="27" y="44" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="2.2" fill="${C.steel}">[PHOTO]</text>`,
    `<text x="27" y="63" text-anchor="middle" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="3.6" fill="${C.navy}">[STAFF NAME]</text>`,
    `<text x="27" y="67" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="2.2" font-weight="600" fill="${color}">${role}</text>`,
    `<line x1="5" y1="70" x2="49" y2="70" stroke="${C.steelLight}" stroke-width=".25"/>`,
    ...[['ID', `${prefix}-[0000]`, 74], ['Deployed at', '[CLIENT]', 77.6], ['Valid till', '[DATE]', 81.2]].map(([k, v, y]) =>
      `<text x="5" y="${y}" font-family="Manrope, Arial, sans-serif" font-size="1.9" fill="${C.steel}">${k}</text><text x="49" y="${y}" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="1.9" font-weight="700" fill="${C.navy}">${v}</text>`),
    `<rect y="83.4" width="54" height="2.2" fill="${C.saffron}"/><path d="M0 83.4h54v-0z" fill="none"/>`,
  ].join(''), `${division} staff ID card`);
}

// Recruitment post 1080 × 1080, Marathi first; one saffron button; phone always visible.
items['social-recruitment-mr.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><title>भरती सुरू आहे – GS Manpower recruitment post</title>${FONTS}` + [
  `<rect width="1080" height="1080" fill="${C.navy}"/>`,
  `<defs><pattern id="st" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="28" fill="${C.white}" opacity=".035"/></pattern></defs><rect width="1080" height="1080" fill="url(#st)"/>`,
  mark(80, 70, 110, C.white),
  `<text x="205" y="140" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="50" fill="${C.white}">GS MANPOWER</text>`,
  `<text x="207" y="172" font-family="Manrope, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="${C.steelLight}">STAFFING · HEALTHCARE · INDUSTRY</text>`,
  `<text x="80" y="370" font-family="Mukta, Nirmala UI, sans-serif" font-weight="800" font-size="104" fill="${C.white}">भरती सुरू आहे</text>`,
  `<text x="84" y="445" font-family="Mukta, Nirmala UI, sans-serif" font-weight="600" font-size="40" fill="${C.steelLight}">भर्ती चालू है · Recruitment open</text>`,
  `<rect x="84" y="490" width="140" height="8" rx="4" fill="${C.saffron}"/>`,
  `<text font-family="Mukta, Nirmala UI, sans-serif" font-weight="600" font-size="44" fill="${C.white}"><tspan x="84" y="590">मशीन ऑपरेटर, हेल्पर आणि हाउसकीपिंग.</tspan><tspan x="84" y="655">वाळूज आणि शेंद्रा MIDC.</tspan></text>`,
  `<text font-family="Mukta, Nirmala UI, sans-serif" font-weight="600" font-size="34" fill="${C.steelLight}"><tspan x="84" y="740">पगार वेळेवर · PF आणि ESIC · कोणतेही शुल्क नाही</tspan></text>`,
  `<rect x="84" y="830" width="620" height="120" rx="24" fill="${C.saffron}"/>`,
  `<text x="394" y="908" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-weight="700" font-size="46" fill="${C.navy}">WhatsApp +91 [PHONE]</text>`,
  `<text x="84" y="1020" font-family="Manrope, Arial, sans-serif" font-size="24" fill="${C.steelLight}">www.gsmanpower.in/mr/careers.html</text>`,
].join('') + '</svg>\n';

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(items)) fs.writeFileSync(path.join(OUT, name), content);
console.log(`Wrote ${Object.keys(items).length} print items to /print`);
