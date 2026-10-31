// Generates the brand illustrations in src/assets/img/illustrations/ (flat vector, brand palette).
// Run: node scripts/illustrations.js   – re-run after editing a scene. Real photography can replace any of them later.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'img', 'illustrations');
const C = {
  navy: '#14213D', navy90: '#1B2A4A', navy80: '#263759', navy70: '#33466B', saffron: '#F2A007', saffronDark: '#D98E00',
  paper: '#F6F4EF', paperDark: '#E9E5DC', steel: '#5B6477', steelLight: '#C9CDD6', teal: '#0E7C70', tealLight: '#5FB3A8',
  white: '#FFFFFF', line: '#E3E0D8',
};
const SKIN = ['#8D5B3E', '#A86F4C', '#6E4630', '#C08A63'];
const HAIR = ['#1E1A17', '#2B211C', '#3A2C24'];

// A person standing on the baseline (x, y = feet), about 200 px tall at scale 1.
function person({ x, y, s = 1, skin = SKIN[0], hair = HAIR[0], top = C.navy, bottom = C.navy80, back = false,
  hairStyle = 'short', helmet = false, vest = false, lanyard = false, cap = false, arm = 'down', hold = '' }) {
  const g = [];
  // legs and shoes
  g.push(`<rect x="-20" y="-82" width="17" height="80" rx="8" fill="${bottom}"/>`, `<rect x="3" y="-82" width="17" height="80" rx="8" fill="${bottom}"/>`);
  g.push(`<ellipse cx="-12" cy="-2" rx="13" ry="5" fill="${C.navy}"/>`, `<ellipse cx="12" cy="-2" rx="13" ry="5" fill="${C.navy}"/>`);
  // arms (behind torso when down)
  const armDown = (side) => `<rect x="${side < 0 ? -42 : 26}" y="-146" width="16" height="64" rx="8" fill="${top}"/><circle cx="${side < 0 ? -34 : 34}" cy="-80" r="8" fill="${skin}"/>`;
  if (arm === 'down' || arm === 'hold') g.push(armDown(-1), armDown(1));
  if (arm === 'point') g.push(armDown(-1), `<g transform="rotate(-62 30 -140)"><rect x="22" y="-146" width="16" height="66" rx="8" fill="${top}"/><circle cx="30" cy="-78" r="8" fill="${skin}"/></g>`);
  if (arm === 'push') g.push(`<g transform="rotate(-70 -34 -140)"><rect x="-42" y="-146" width="16" height="62" rx="8" fill="${top}"/><circle cx="-34" cy="-82" r="8" fill="${skin}"/></g>`, `<g transform="rotate(-70 34 -140)"><rect x="26" y="-146" width="16" height="62" rx="8" fill="${top}"/><circle cx="34" cy="-82" r="8" fill="${skin}"/></g>`);
  // torso
  g.push(`<rect x="-30" y="-152" width="60" height="80" rx="20" fill="${top}"/>`);
  if (vest) g.push(`<path d="M-30 -132 Q-30 -152 -12 -152 L-6 -152 L-6 -74 L-30 -74 Z M30 -132 Q30 -152 12 -152 L6 -152 L6 -74 L30 -74 Z" fill="${C.saffron}"/>`,
    `<rect x="-30" y="-104" width="24" height="5" fill="${C.steelLight}"/><rect x="6" y="-104" width="24" height="5" fill="${C.steelLight}"/>`);
  if (lanyard && !back) g.push(`<path d="M-10 -152 L0 -118 L10 -152" fill="none" stroke="${C.saffron}" stroke-width="3"/>`, `<rect x="-8" y="-120" width="16" height="20" rx="3" fill="${C.white}"/><rect x="-5" y="-116" width="10" height="4" fill="${C.saffron}"/>`);
  // neck and head
  g.push(`<rect x="-7" y="-164" width="14" height="14" fill="${skin}"/>`, `<circle cx="0" cy="-180" r="21" fill="${back ? hair : skin}"/>`);
  if (!back) {
    if (hairStyle === 'bun') g.push(`<path d="M-21 -180 A21 21 0 0 1 21 -180 Q14 -194 0 -195 Q-14 -194 -21 -180 Z" fill="${hair}"/><circle cx="0" cy="-203" r="9" fill="${hair}"/>`);
    else if (hairStyle === 'long') g.push(`<path d="M-22 -178 A22 22 0 0 1 22 -178 L22 -150 L14 -150 L14 -176 Q0 -192 -14 -176 L-14 -150 L-22 -150 Z" fill="${hair}"/>`);
    else g.push(`<path d="M-21 -182 A21 21 0 0 1 21 -182 Q12 -192 0 -192 Q-12 -192 -21 -182 Z" fill="${hair}"/>`);
  } else if (hairStyle === 'bun') g.push(`<circle cx="0" cy="-200" r="9" fill="${hair}"/>`);
  if (helmet) g.push(`<path d="M-24 -184 A24 24 0 0 1 24 -184 Z" fill="${C.saffron}"/><rect x="-28" y="-186" width="56" height="6" rx="3" fill="${C.saffronDark}"/>`);
  if (cap) g.push(`<path d="M-21 -186 A21 21 0 0 1 21 -186 L21 -182 L-21 -182 Z" fill="${C.white}"/>`);
  if (hold === 'clipboard') g.push(`<rect x="28" y="-120" width="26" height="34" rx="3" fill="${C.paperDark}"/><rect x="34" y="-124" width="14" height="6" rx="2" fill="${C.steel}"/><path d="M33 -108h16M33 -101h16M33 -94h10" stroke="${C.steel}" stroke-width="2"/>`);
  if (hold === 'mop') g.push(`<path d="M40 -150 L58 0" stroke="${C.steel}" stroke-width="5" stroke-linecap="round"/><rect x="44" y="-6" width="34" height="10" rx="4" fill="${C.steelLight}"/>`);
  if (hold === 'box') g.push(`<rect x="-26" y="-140" width="52" height="40" rx="3" fill="#C9A36B"/><path d="M-26 -126 H26" stroke="#A9854F" stroke-width="3"/>`);
  return `<g transform="translate(${x} ${y}) scale(${s})">${g.join('')}</g>`;
}

const svg = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t"><title id="t">${title}</title>${body}</svg>\n`;
const stripes = (id, color, opacity) => `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="16" fill="${color}" opacity="${opacity}"/></pattern>`;

const scenes = {
  // Hero, 4:5 – hospital nurses' station before the 7 AM shift.
  'hero-care.svg': svg(800, 1000, 'A ward attendant and a housekeeping supervisor at a hospital nurses’ station before the 7 AM shift', [
    `<defs>${stripes('s1', C.white, 0.035)}<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.navy80}"/><stop offset="1" stop-color="${C.navy}"/></linearGradient></defs>`,
    `<rect width="800" height="1000" fill="url(#g1)"/><rect width="800" height="1000" fill="url(#s1)"/>`,
    // window with morning light
    `<rect x="80" y="120" width="300" height="360" rx="10" fill="${C.navy70}"/><rect x="96" y="136" width="268" height="328" rx="6" fill="#3E5680"/>`,
    `<circle cx="300" cy="230" r="46" fill="${C.saffron}" opacity=".9"/><path d="M96 380 Q200 330 364 370 V464 H96 Z" fill="${C.navy80}"/><path d="M230 136 V464 M96 300 H364" stroke="${C.navy70}" stroke-width="8"/>`,
    // wall clock at 7:00
    `<circle cx="590" cy="210" r="62" fill="${C.paper}"/><circle cx="590" cy="210" r="62" fill="none" stroke="${C.steelLight}" stroke-width="6"/>`,
    `<path d="M590 210 V166 M590 210 L556 230" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/><circle cx="590" cy="210" r="6" fill="${C.saffron}"/>`,
    `<g fill="${C.navy}">${[0, 90, 180, 270].map((a) => `<rect x="587" y="154" width="6" height="12" transform="rotate(${a} 590 210)"/>`).join('')}</g>`,
    // red cross sign
    `<rect x="520" y="330" width="140" height="56" rx="8" fill="${C.white}"/><path d="M552 346 v24 M540 358 h24" stroke="${C.teal}" stroke-width="7" stroke-linecap="round"/><rect x="578" y="350" width="64" height="7" rx="3" fill="${C.steelLight}"/><rect x="578" y="364" width="44" height="7" rx="3" fill="${C.steelLight}"/>`,
    // floor
    `<rect y="800" width="800" height="200" fill="${C.navy90}"/><path d="M0 800 H800" stroke="${C.navy70}" stroke-width="4"/>`,
    // nurses' station counter
    `<rect x="60" y="640" width="680" height="170" rx="14" fill="${C.paper}"/><rect x="60" y="640" width="680" height="26" rx="10" fill="${C.white}"/><rect x="60" y="700" width="680" height="10" fill="${C.teal}"/>`,
    `<rect x="110" y="590" width="120" height="56" rx="6" fill="${C.navy80}"/><rect x="118" y="598" width="104" height="40" rx="3" fill="#3E5680"/>`,
    `<rect x="560" y="610" width="70" height="34" rx="4" fill="${C.steelLight}"/>`,
    // people behind the counter (upper bodies)
    `<g>${person({ x: 330, y: 720, s: 1.9, top: C.teal, bottom: C.teal, skin: SKIN[1], hairStyle: 'bun', lanyard: true, cap: false })}</g>`,
    `<g>${person({ x: 520, y: 720, s: 1.9, top: C.navy80, bottom: C.navy, skin: SKIN[0], hairStyle: 'short', lanyard: true, hold: 'clipboard', arm: 'hold' })}</g>`,
    `<rect x="60" y="666" width="680" height="144" rx="0" fill="${C.paper}"/><rect x="60" y="700" width="680" height="10" fill="${C.teal}"/><rect x="60" y="800" width="680" height="10" fill="${C.paperDark}"/>`,
    `<rect x="94" y="730" width="160" height="50" rx="6" fill="${C.white}"/><path d="M114 755 h120" stroke="${C.steelLight}" stroke-width="6" stroke-linecap="round"/>`,
  ].join('')),

  // Training room, 4:3 – induction with wheelchair transfer.
  'training.svg': svg(800, 600, 'A trainer showing new ward attendants a wheelchair transfer during induction', [
    `<rect width="800" height="600" fill="${C.paper}"/><rect y="440" width="800" height="160" fill="${C.paperDark}"/>`,
    // whiteboard with checklist
    `<rect x="60" y="70" width="380" height="230" rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="4"/><rect x="60" y="70" width="380" height="36" rx="10" fill="${C.navy}"/>`,
    `<rect x="84" y="80" width="140" height="14" rx="7" fill="${C.saffron}"/>`,
    ...[0, 1, 2, 3].map((i) => `<rect x="90" y="${130 + i * 40}" width="22" height="22" rx="4" fill="none" stroke="${C.teal}" stroke-width="4"/>${i < 3 ? `<path d="M94 ${141 + i * 40} l6 6 l10 -12" fill="none" stroke="${C.teal}" stroke-width="4" stroke-linecap="round"/>` : ''}<rect x="128" y="${134 + i * 40}" width="${220 - i * 30}" height="12" rx="6" fill="${C.steelLight}"/>`),
    // wheelchair
    `<g transform="translate(520 470)"><circle cx="0" cy="0" r="56" fill="none" stroke="${C.navy}" stroke-width="10"/><circle cx="0" cy="0" r="8" fill="${C.navy}"/><circle cx="96" cy="34" r="20" fill="none" stroke="${C.navy}" stroke-width="8"/>`,
    `<path d="M-10 -40 H80 V10 M80 -40 V-110 M-10 -40 L-10 -110 L-40 -116" fill="none" stroke="${C.steel}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><rect x="-6" y="-60" width="90" height="20" rx="6" fill="${C.teal}"/><rect x="66" y="-120" width="20" height="70" rx="6" fill="${C.teal}"/></g>`,
    // trainer pointing
    person({ x: 470, y: 540, s: 1.55, top: C.navy, bottom: C.navy80, skin: SKIN[2], hairStyle: 'short', lanyard: true, arm: 'point' }),
    // trainees from behind
    person({ x: 130, y: 600, s: 1.7, back: true, top: C.teal, bottom: C.teal, hair: HAIR[1], hairStyle: 'bun' }),
    person({ x: 260, y: 610, s: 1.8, back: true, top: C.teal, bottom: C.teal, hair: HAIR[0] }),
    person({ x: 700, y: 610, s: 1.75, back: true, top: C.teal, bottom: C.teal, hair: HAIR[2], hairStyle: 'long' }),
  ].join('')),

  // Ward housekeeping, 16:9 – empty bed, colour-coded waste bins.
  'ward-housekeeping.svg': svg(800, 450, 'Housekeeping staff cleaning an empty hospital ward bay with colour-coded waste bins', [
    `<rect width="800" height="450" fill="${C.paper}"/><rect y="340" width="800" height="110" fill="${C.paperDark}"/>`,
    `<path d="M0 340 H800" stroke="${C.line}" stroke-width="4"/>`,
    // curtain rail and curtain
    `<rect x="40" y="40" width="300" height="8" rx="4" fill="${C.steel}"/><path d="M50 48 h80 v250 q-20 10 -40 0 q-20 10 -40 0 z" fill="${C.tealLight}" opacity=".6"/>`,
    // bed
    `<rect x="150" y="230" width="300" height="34" rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="3"/><rect x="150" y="214" width="70" height="24" rx="10" fill="${C.white}" stroke="${C.line}" stroke-width="3"/>`,
    `<rect x="160" y="264" width="10" height="80" fill="${C.steel}"/><rect x="430" y="264" width="10" height="80" fill="${C.steel}"/><rect x="140" y="170" width="12" height="174" rx="6" fill="${C.steel}"/><rect x="448" y="200" width="12" height="144" rx="6" fill="${C.steel}"/>`,
    `<rect x="236" y="226" width="200" height="12" rx="6" fill="${C.teal}" opacity=".5"/>`,
    // waste bins: yellow, red, blue, black (BMW colour coding)
    ...[['#E3B505', 560], ['#C0392B', 610], ['#2F6DB5', 660], ['#2A2A2A', 710]].map(([c, x]) => `<rect x="${x}" y="290" width="40" height="54" rx="6" fill="${c}"/><rect x="${x - 3}" y="284" width="46" height="10" rx="4" fill="${c}"/>`),
    // cleaning trolley
    `<rect x="470" y="250" width="70" height="80" rx="6" fill="${C.navy80}"/><rect x="476" y="236" width="58" height="16" rx="4" fill="${C.saffron}"/><circle cx="480" cy="338" r="8" fill="${C.navy}"/><circle cx="530" cy="338" r="8" fill="${C.navy}"/>`,
    // housekeeper with mop
    person({ x: 370, y: 410, s: 1.25, top: C.navy80, bottom: C.navy, skin: SKIN[3], hairStyle: 'bun', hold: 'mop', arm: 'hold', lanyard: true }),
    // window
    `<rect x="560" y="60" width="180" height="140" rx="8" fill="${C.navy80}"/><rect x="572" y="72" width="156" height="116" rx="4" fill="#3E5680"/><path d="M650 72 V188" stroke="${C.navy80}" stroke-width="6"/><circle cx="700" cy="110" r="20" fill="${C.saffron}" opacity=".85"/>`,
  ].join('')),

  // MIDC packing line, 16:9.
  'industrial-line.svg': svg(800, 450, 'Workers in safety helmets and high-visibility vests at a packing line in a MIDC plant', [
    `<defs>${stripes('s2', C.white, 0.04)}</defs>`,
    `<rect width="800" height="450" fill="${C.navy90}"/><rect width="800" height="450" fill="url(#s2)"/>`,
    // roof trusses and lights
    `<path d="M0 60 L200 20 L400 60 L600 20 L800 60" fill="none" stroke="${C.navy70}" stroke-width="8"/>`,
    ...[120, 400, 680].map((x) => `<rect x="${x - 30}" y="70" width="60" height="10" rx="5" fill="${C.paper}" opacity=".8"/>`),
    // machine
    `<rect x="30" y="170" width="150" height="190" rx="10" fill="${C.navy80}"/><rect x="50" y="190" width="110" height="60" rx="6" fill="#3E5680"/><circle cx="80" cy="300" r="14" fill="${C.saffron}"/><circle cx="125" cy="300" r="14" fill="${C.tealLight}"/>`,
    // conveyor
    `<rect x="160" y="300" width="620" height="22" rx="11" fill="${C.steel}"/>`,
    ...Array.from({ length: 10 }, (_, i) => `<circle cx="${180 + i * 64}" cy="311" r="7" fill="${C.navy}"/>`),
    `<rect x="200" y="322" width="10" height="70" fill="${C.steel}"/><rect x="740" y="322" width="10" height="70" fill="${C.steel}"/>`,
    ...[260, 420, 580].map((x) => `<rect x="${x}" y="256" width="62" height="44" rx="3" fill="#C9A36B"/><path d="M${x} 270 H${x + 62}" stroke="#A9854F" stroke-width="3"/>`),
    // floor safety line
    `<rect y="392" width="800" height="58" fill="${C.navy}"/><rect y="392" width="800" height="8" fill="url(#hz)"/>`,
    `<defs><pattern id="hz" width="24" height="8" patternUnits="userSpaceOnUse"><rect width="12" height="8" fill="${C.saffron}"/><rect x="12" width="12" height="8" fill="${C.navy}"/></pattern></defs>`,
    // workers
    person({ x: 340, y: 430, s: 1.35, top: C.navy70, bottom: C.navy80, skin: SKIN[0], helmet: true, vest: true, arm: 'hold', hold: 'box' }),
    person({ x: 520, y: 430, s: 1.35, top: C.navy70, bottom: C.navy80, skin: SKIN[2], helmet: true, vest: true, arm: 'push' }),
    person({ x: 690, y: 430, s: 1.3, top: C.navy70, bottom: C.navy80, skin: SKIN[1], helmet: true, vest: true, hold: 'clipboard', arm: 'hold' }),
  ].join('')),

  // Office team, 4:3 – GS Manpower office / front desk.
  'office-team.svg': svg(800, 600, 'The GS Manpower office team at work: a recruiter on a call and a colleague at a computer', [
    `<rect width="800" height="600" fill="${C.paper}"/><rect y="460" width="800" height="140" fill="${C.paperDark}"/>`,
    // wall logo panel
    `<rect x="470" y="70" width="270" height="130" rx="12" fill="${C.navy}"/>`,
    `<g transform="translate(500 100) scale(1.6)"><path d="M33.64 12.51A15 15 0 1 0 39 24H31" fill="none" stroke="${C.white}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-4.5 -4.5)"/><circle cx="18" cy="12" r="3.3" fill="${C.saffron}"/><path d="M18 19.1V23.1" stroke="${C.saffron}" stroke-width="6.4" stroke-linecap="round"/></g>`,
    `<rect x="590" y="118" width="120" height="16" rx="4" fill="${C.white}"/><rect x="590" y="144" width="96" height="8" rx="4" fill="${C.steelLight}"/>`,
    // shelf with files
    `<rect x="60" y="120" width="300" height="10" rx="4" fill="${C.steel}"/>`,
    ...[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${76 + i * 40}" y="${60 + (i % 2) * 6}" width="30" height="${60 - (i % 2) * 6}" rx="3" fill="${[C.teal, C.navy80, C.saffron, C.navy, C.tealLight, C.steel][i]}"/>`),
    // desks
    `<rect x="40" y="380" width="340" height="20" rx="6" fill="${C.navy80}"/><rect x="60" y="400" width="14" height="80" fill="${C.navy80}"/><rect x="346" y="400" width="14" height="80" fill="${C.navy80}"/>`,
    `<rect x="430" y="380" width="340" height="20" rx="6" fill="${C.navy80}"/><rect x="450" y="400" width="14" height="80" fill="${C.navy80}"/><rect x="736" y="400" width="14" height="80" fill="${C.navy80}"/>`,
    // people seated (drawn before monitors so monitors overlap hands)
    person({ x: 210, y: 470, s: 1.3, top: C.white, bottom: C.navy, skin: SKIN[1], hairStyle: 'long', lanyard: true, arm: 'point' }),
    person({ x: 600, y: 470, s: 1.3, top: C.teal, bottom: C.navy, skin: SKIN[0], hairStyle: 'short', lanyard: true }),
    `<rect x="40" y="380" width="340" height="20" rx="6" fill="${C.navy80}"/><rect x="430" y="380" width="340" height="20" rx="6" fill="${C.navy80}"/>`,
    // monitors and phone
    `<rect x="520" y="290" width="150" height="92" rx="6" fill="${C.navy}"/><rect x="528" y="298" width="134" height="72" rx="3" fill="#3E5680"/><rect x="540" y="310" width="80" height="8" rx="4" fill="${C.saffron}"/><rect x="540" y="326" width="100" height="6" rx="3" fill="${C.steelLight}"/><rect x="540" y="338" width="90" height="6" rx="3" fill="${C.steelLight}"/>`,
    `<rect x="80" y="352" width="60" height="28" rx="6" fill="${C.steel}"/><rect x="260" y="350" width="80" height="30" rx="4" fill="${C.white}"/>`,
  ].join('')),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(scenes)) fs.writeFileSync(path.join(OUT, name), content);
console.log(`Wrote ${Object.keys(scenes).length} illustrations to ${path.relative(process.cwd(), OUT)}`);
