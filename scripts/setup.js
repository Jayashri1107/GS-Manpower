// Creates the secrets the server needs and writes them to .env (never committed).
//   npm run setup                 new .env with a data key and an admin password (printed once)
//   npm run setup -- --password   only set a new admin password (keeps the data key)
//   npm run setup -- --print      print values to paste into your hosting provider, without writing .env
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../server/crypto');

const ENV = path.join(__dirname, '..', '.env');
const args = process.argv.slice(2);
const existing = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8') : '';
const get = (k) => (new RegExp(`^${k}=(.*)$`, 'm').exec(existing) || [])[1];

// Readable password: 4 groups of 4 characters without look-alike letters.
const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const password = Array.from({ length: 4 }, () =>
  Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('')).join('-');

const dataKey = args.includes('--password') && get('DATA_KEY') ? get('DATA_KEY') : crypto.randomBytes(32).toString('base64');
const values = { DATA_KEY: dataKey, ADMIN_USER: get('ADMIN_USER') || 'admin', ADMIN_PASSWORD_HASH: hashPassword(password) };

if (args.includes('--print')) {
  console.log('\nAdd these as environment variables on your host:\n');
  for (const [k, v] of Object.entries(values)) console.log(`${k}=${v}`);
} else {
  if (get('DATA_KEY') && !args.includes('--password')) {
    console.error('.env already has a DATA_KEY. Changing it would make existing stored data unreadable.');
    console.error('To change only the admin password run:  npm run setup -- --password');
    process.exit(1);
  }
  let out = existing;
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    out = new RegExp(`^${k}=.*$`, 'm').test(out) ? out.replace(new RegExp(`^${k}=.*$`, 'm'), line) : `${out}${out && !out.endsWith('\n') ? '\n' : ''}${line}\n`;
  }
  fs.writeFileSync(ENV, out, { mode: 0o600 });
  console.log('\nSaved to .env');
}

console.log('\nAdmin login');
console.log(`  Username: ${values.ADMIN_USER}`);
console.log(`  Password: ${password}`);
if (!args.includes('--print')) console.log('\nThis password works straight away. Each run of this command replaces the previous password.');
console.log('\nWrite the password down now – it is not stored anywhere in readable form.');
console.log('Keep DATA_KEY safe: without it, stored enquiries and applications cannot be read.\n');
