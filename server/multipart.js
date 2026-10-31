// Small multipart/form-data and urlencoded body parser (no dependencies).
// Returns { fields: { name: string | string[] }, files: { name: { filename, contentType, data } } }

function addField(fields, name, value) {
  if (name in fields) fields[name] = [].concat(fields[name], value);
  else fields[name] = value;
}

function parseMultipart(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) throw new Error('Missing multipart boundary');
  const boundary = Buffer.from('--' + (m[1] || m[2]));
  const fields = {};
  const files = {};

  let pos = body.indexOf(boundary);
  while (pos !== -1) {
    pos += boundary.length;
    if (body.subarray(pos, pos + 2).toString() === '--') break; // closing boundary
    pos += 2; // CRLF
    const headerEnd = body.indexOf('\r\n\r\n', pos);
    if (headerEnd === -1) break;
    const headers = body.subarray(pos, headerEnd).toString('utf8');
    const next = body.indexOf(boundary, headerEnd + 4);
    if (next === -1) break;
    const data = body.subarray(headerEnd + 4, next - 2); // strip CRLF before boundary
    pos = next;

    const disp = /content-disposition:[^\r\n]*/i.exec(headers);
    if (!disp) continue;
    const name = /\bname="([^"]*)"/i.exec(disp[0]);
    if (!name) continue;
    const filename = /\bfilename="([^"]*)"/i.exec(disp[0]);
    if (filename) {
      if (!filename[1] || data.length === 0) continue; // empty file input
      const ct = /content-type:\s*([^\r\n]+)/i.exec(headers);
      files[name[1]] = { filename: filename[1].replace(/[\\/]/g, '_').slice(0, 120), contentType: ct ? ct[1].trim() : 'application/octet-stream', data };
    } else {
      addField(fields, name[1], data.toString('utf8'));
    }
  }
  return { fields, files };
}

function parseBody(body, contentType = '') {
  if (/^multipart\/form-data/i.test(contentType)) return parseMultipart(body, contentType);
  if (/^application\/x-www-form-urlencoded/i.test(contentType)) {
    const fields = {};
    for (const [k, v] of new URLSearchParams(body.toString('utf8'))) addField(fields, k, v);
    return { fields, files: {} };
  }
  if (/^application\/json/i.test(contentType)) return { fields: JSON.parse(body.toString('utf8') || '{}'), files: {} };
  throw new Error('Unsupported content type');
}

module.exports = { parseBody, parseMultipart };
