/* GS Manpower admin panel. All record data is inserted with textContent, never as HTML. */
(function () {
  'use strict';
  var state = { tab: 'dashboard', items: { enquiry: [], application: [] }, selected: null, filter: '', search: '' };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var STATUS = { 'new': 'New', contacted: 'Contacted', 'in-progress': 'In progress', closed: 'Closed' };
  var TYPE = {
    enquiry: { title: 'Manpower enquiries', one: 'enquiry', name: function (r) { return r.organisation; } },
    application: { title: 'Job applications', one: 'application', name: function (r) { return r.full_name; } },
  };
  var ACTIONS = {
    login: ['Logged in', 'ok'], logout: ['Logged out', ''], 'login-failed': ['Failed login attempt', 'warn'],
    list: ['Opened list', ''], view: ['Viewed record', ''], update: ['Updated record', 'ok'], delete: ['Deleted record', 'warn'],
    'download-resume': ['Downloaded resume', ''], 'edit-content': ['Changed website settings', 'ok'], export: ['Exported CSV', ''],
  };

  // ---------- helpers ----------
  function api(method, url, body) {
    var opts = { method: method, headers: { 'X-GSM-Admin': '1' }, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch('/api/admin' + url, opts).then(function (res) {
      if (res.status === 401 && url !== '/login') {
        show(false);
        if (url !== '/me') toast('You were logged out. Please log in again.', true);
        throw new Error('logged out');
      }
      return res.json().then(function (data) { data.status = res.status; return data; });
    });
  }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function icon(name) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'ic');
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#a-' + name);
    s.appendChild(u);
    return s;
  }
  var fmtDate = function (iso) { return iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''; };
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' days ago';
    return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  }
  var badge = function (s) { return el('span', { class: 'status status-' + s, text: STATUS[s] || s }); };
  var digits = function (p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
  var toastTimer;
  function toast(text, isError) {
    var t = $('[data-toast]');
    t.textContent = '';
    t.appendChild(icon(isError ? 'alert' : 'check'));
    t.appendChild(document.createTextNode(text));
    t.classList.toggle('is-error', !!isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function download(url) {
    return fetch(url, { headers: { 'X-GSM-Admin': '1' }, credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error();
      var name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '') || [])[1] || 'download';
      return res.blob().then(function (b) {
        var href = URL.createObjectURL(b);
        var a = el('a', { href: href, download: name });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(href); }, 1000);
      });
    });
  }

  // ---------- shell ----------
  function show(loggedIn, user) {
    $$('[data-when="in"]').forEach(function (n) { n.hidden = !loggedIn; });
    $$('[data-when="out"]').forEach(function (n) { n.hidden = loggedIn; });
    document.body.classList.toggle('in-app', !!loggedIn);
    if (loggedIn) {
      $('[data-user]').textContent = '(' + user + ')';
      loadCounts();
      openTab(state.tab);
    } else setTimeout(function () { var u = $('#u'); if (u) u.focus(); }, 0);
  }

  function openTab(tab) {
    state.tab = tab;
    $$('[data-tab]').forEach(function (b) { b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    var view = tab === 'enquiry' || tab === 'application' ? 'leads' : tab;
    $$('[data-view]').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    window.scrollTo(0, 0);
    $('.main').scrollTop = 0;
    if (view === 'leads') openLeads(tab);
    else if (tab === 'dashboard') loadDashboard();
    else if (tab === 'content') loadContent();
    else loadAudit();
  }

  function loadType(type) {
    return api('GET', '/leads/' + type).then(function (d) {
      state.items[type] = d.items || [];
      var n = state.items[type].filter(function (i) { return i.status === 'new'; }).length;
      $('[data-count="' + type + '"]').textContent = n ? String(n) : '';
      return state.items[type];
    });
  }
  function loadCounts() {
    api('GET', '/content').then(function (d) {
      var n = Object.keys(d.values).filter(function (k) { return /\[.*\]/.test(String(d.values[k])); }).length;
      $('[data-count="content"]').textContent = n ? String(n) : '';
    }).catch(function () {});
  }

  // ---------- dashboard ----------
  function loadDashboard() {
    var h = new Date().getHours();
    $('[data-greeting]').textContent = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + '. Here is what came in through the website.';
    Promise.all([loadType('enquiry'), loadType('application')]).then(function (r) {
      var enq = r[0], app = r[1];
      var weekAgo = Date.now() - 7 * 86400000;
      var workers = enq.filter(function (e) { return e.status !== 'closed'; }).reduce(function (s, e) { return s + (Number(e.worker_count) || 0); }, 0);
      var stats = [
        ['stat--new', enq.filter(function (e) { return e.status === 'new'; }).length, 'New enquiries', 'enquiry'],
        ['stat--new', app.filter(function (a) { return a.status === 'new'; }).length, 'New applications', 'application'],
        ['', workers, 'Workers requested (open enquiries)', 'enquiry'],
        ['stat--care', enq.concat(app).filter(function (x) { return new Date(x.createdAt).getTime() > weekAgo; }).length, 'Received in the last 7 days', 'enquiry'],
      ];
      var box = $('[data-stats]');
      box.textContent = '';
      stats.forEach(function (s) {
        var b = el('button', { type: 'button', class: 'stat ' + s[0] }, [el('b', { text: String(s[1]) }), el('span', { text: s[2] })]);
        b.addEventListener('click', function () { if (s[2].indexOf('New') === 0) state.filter = 'new'; openTab(s[3]); });
        box.appendChild(b);
      });
      renderRecent('enquiry', enq);
      renderRecent('application', app);
    });
    api('GET', '/content').then(function (d) {
      var missing = d.fields.filter(function (f) { return /\[.*\]/.test(String(d.values[f.key])); });
      var card = $('[data-setup]');
      card.hidden = !missing.length;
      if (!missing.length) return;
      card.textContent = '';
      var btn = el('button', { type: 'button', class: 'link', text: 'Open website settings' });
      btn.addEventListener('click', function () { openTab('content'); });
      card.appendChild(icon('alert'));
      card.appendChild(el('div', {}, [
        el('strong', { text: missing.length + ' website setting' + (missing.length > 1 ? 's still show' : ' still shows') + ' a placeholder' }),
        el('p', { text: missing.map(function (f) { return f.label; }).join(', ') + '. ' }, [btn]),
      ]));
    });
  }
  function renderRecent(type, items) {
    var box = $('[data-recent="' + type + '"]');
    box.textContent = '';
    if (!items.length) { box.appendChild(el('p', { class: 'empty', text: 'Nothing yet.' })); return; }
    items.slice(0, 5).forEach(function (i) { box.appendChild(row(type, i, function () { state.selected = i.id; openTab(type); })); });
  }

  // ---------- leads ----------
  function summary(type, i) {
    return type === 'enquiry' ? i.worker_count + ' × ' + i.role + ' · ' + i.location : i.role + ' · ' + i.experience + ' · ' + i.location;
  }
  function row(type, i, onClick) {
    var top = el('strong', { text: TYPE[type].name(i) });
    var r = el('button', { type: 'button', class: 'row', 'aria-current': String(state.selected === i.id && state.tab === type) }, [
      top, badge(i.status), el('span', { class: 'sub', text: summary(type, i) }),
      el('time', { datetime: i.createdAt, title: fmtDate(i.createdAt), text: ago(i.createdAt) + (i.lang === 'mr' ? ' · Marathi form' : '') }),
    ]);
    r.addEventListener('click', onClick);
    return r;
  }
  function openLeads(type) {
    $('[data-leads-title]').textContent = TYPE[type].title;
    $('[data-search]').value = state.search;
    $$('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)); });
    $('.leads').classList.remove('is-open');
    placeholder();
    loadType(type).then(function () {
      renderList();
      if (state.selected && state.items[type].some(function (i) { return i.id === state.selected; })) openDetail(state.selected);
    });
  }
  function filtered() {
    var q = state.search.trim().toLowerCase();
    return state.items[state.tab].filter(function (i) {
      if (state.filter && i.status !== state.filter) return false;
      if (!q) return true;
      return [i.organisation, i.contact_name, i.full_name, i.phone, i.email, i.role, i.location].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }
  function renderList() {
    var list = $('[data-list]');
    var all = state.items[state.tab];
    var items = filtered();
    var open = all.filter(function (i) { return i.status !== 'closed'; }).length;
    $('[data-leads-sub]').textContent = all.length + ' in total · ' + open + ' open' + (items.length !== all.length ? ' · showing ' + items.length : '');
    list.textContent = '';
    if (!items.length) {
      list.appendChild(el('p', { class: 'empty', text: all.length ? 'No records match this search or filter.' : 'No ' + TYPE[state.tab].one + 's yet. They appear here as soon as someone sends the form.' }));
      return;
    }
    items.forEach(function (i) { list.appendChild(row(state.tab, i, function () { openDetail(i.id); })); });
  }
  function placeholder() {
    var box = $('[data-detail]');
    box.textContent = '';
    box.appendChild(el('p', { class: 'detail-placeholder', text: 'Select a record on the left to see the details.' }));
  }

  function openDetail(id) {
    state.selected = id;
    var type = state.tab;
    renderList();
    api('GET', '/leads/' + type + '/' + id).then(function (data) {
      if (!data.ok) { toast('This record no longer exists.', true); return; }
      var r = data.item;
      var box = $('[data-detail]');
      box.textContent = '';
      $('.leads').classList.add('is-open');

      var back = el('button', { type: 'button', class: 'btn btn-ghost back' }, [icon('back'), 'Back to list']);
      back.addEventListener('click', function () { $('.leads').classList.remove('is-open'); state.selected = null; renderList(); });
      box.appendChild(back);

      box.appendChild(el('div', { class: 'detail-head' }, [
        el('div', {}, [el('h2', { text: TYPE[type].name(r) }), el('p', { text: type === 'enquiry' ? 'Contact: ' + r.contact_name : summary(type, r) })]),
        badge(r.status),
      ]));

      var quick = el('div', { class: 'quick' });
      quick.appendChild(el('a', { class: 'btn btn-navy', href: 'tel:' + String(r.phone).replace(/\s/g, '') }, [icon('phone'), 'Call ' + r.phone]));
      quick.appendChild(el('a', { class: 'btn btn-ghost wa', href: 'https://wa.me/' + digits(r.phone), target: '_blank', rel: 'noopener' }, [icon('chat'), 'WhatsApp']));
      if (r.email) quick.appendChild(el('a', { class: 'btn btn-ghost', href: 'mailto:' + r.email }, [icon('mail'), 'Email']));
      if (r.resume) {
        var dl = el('button', { type: 'button', class: 'btn btn-ghost' }, [icon('file'), 'Resume (' + r.resume.ext.toUpperCase() + ', ' + Math.ceil(r.resume.size / 1024) + ' KB)']);
        dl.addEventListener('click', function () { download('/api/admin/leads/application/' + id + '/resume').catch(function () { toast('Could not download the resume.', true); }); });
        quick.appendChild(dl);
      }
      box.appendChild(quick);

      var facts = type === 'enquiry'
        ? [['Role needed', r.role], ['Workers', r.worker_count], ['Location', r.location], ['Needed', r.timeline], ['Shifts', (r.shifts || []).join(', ')], ['Email', r.email], ['Notes', r.notes, true]]
        : [['Job wanted', r.role], ['Experience', r.experience], ['Preferred location', r.location], ['Can join', r.availability], ['Mobile', r.phone]];
      facts.push(['Received', fmtDate(r.createdAt)], ['Form language', r.lang === 'mr' ? 'Marathi' : 'English']);
      var dl2 = el('dl', { class: 'facts' });
      facts.forEach(function (f) { if (f[1] === undefined || f[1] === '') return; dl2.appendChild(el('div', { class: 'fact' + (f[2] ? ' fact--wide' : '') }, [el('dt', { text: f[0] }), el('dd', { text: String(f[1]) })])); });
      box.appendChild(dl2);

      var select = el('select', { id: 'st' });
      Object.keys(STATUS).forEach(function (s) { var o = el('option', { value: s, text: STATUS[s] }); if (s === r.status) o.selected = true; select.appendChild(o); });
      var note = el('textarea', { id: 'nt', maxlength: '2000', placeholder: 'For example: Called on Monday, sending proposal Wednesday' }); note.value = r.note || '';
      var save = el('button', { type: 'button', class: 'btn btn-primary', text: 'Save changes' });
      var del = el('button', { type: 'button', class: 'btn btn-danger' }, [icon('trash'), 'Delete permanently']);
      box.appendChild(el('div', { class: 'followup' }, [
        el('h2', { text: 'Follow-up' }),
        el('div', { class: 'followup-grid' }, [
          el('div', {}, [el('label', { for: 'st', text: 'Status' }), select]),
          el('div', {}, [el('label', { for: 'nt', text: 'Internal note (never shown to the person)' }), note]),
        ]),
        el('div', { class: 'actions' }, [save, del]),
      ]));
      box.appendChild(el('p', { class: 'meta', text: 'Consent given ' + fmtDate(r.consentAt) + (r.updatedAt ? ' · Last updated ' + fmtDate(r.updatedAt) : '') }));

      save.addEventListener('click', function () {
        save.disabled = true;
        api('PATCH', '/leads/' + type + '/' + id, { status: select.value, note: note.value }).then(function (d) {
          save.disabled = false;
          if (!d.ok) { toast('Could not save.', true); return; }
          toast('Saved.');
          loadType(type).then(function () { renderList(); openDetail(id); });
        });
      });
      del.addEventListener('click', function () {
        if (!window.confirm('Delete "' + TYPE[type].name(r) + '" permanently?\n\nUse this when the person asks for their data to be deleted. It cannot be undone.')) return;
        api('DELETE', '/leads/' + type + '/' + id).then(function () {
          toast('Record deleted.');
          state.selected = null;
          $('.leads').classList.remove('is-open');
          placeholder();
          loadType(type).then(renderList);
        });
      });
    });
  }

  // ---------- website settings ----------
  var GROUP_HELP = {
    Contact: 'Shown in the header, footer, contact page, WhatsApp button and both forms.',
    Registrations: 'Shown on the home page and About page. Publish only registrations the company actually holds.',
    Website: 'Analytics and the security-service switch.',
  };
  function loadContent() {
    api('GET', '/content').then(function (data) {
      var form = $('[data-content]');
      form.textContent = '';
      form.className = 'settings';
      var groups = {};
      data.fields.forEach(function (f) {
        if (!groups[f.group]) {
          groups[f.group] = el('fieldset', { class: 'card settings-group' }, [el('h2', { text: f.group }), el('p', { text: GROUP_HELP[f.group] || '' })]);
          form.appendChild(groups[f.group]);
        }
        var id = 'f-' + f.key.replace('.', '-');
        var input;
        var label = el('label', { for: id }, [f.label, f.example ? el('span', { class: 'help', text: 'Example: ' + f.example }) : null]);
        if (f.type === 'boolean') {
          input = el('input', { type: 'checkbox', id: id, name: f.key });
          input.checked = !!data.values[f.key];
          input = el('span', { class: 'switch' }, [input, el('span', { text: 'Show on the website' })]);
        } else {
          input = el('input', { id: id, name: f.key });
          input.value = data.values[f.key];
          if (/\[.*\]/.test(input.value)) input.classList.add('placeholder-value');
        }
        groups[f.group].appendChild(el('div', { class: 'setting' }, [label, input, el('p', { class: 'err', 'data-err': f.key })]));
      });
      var save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save and publish' });
      form.appendChild(el('div', { class: 'save-bar' }, [el('p', { class: 'muted', text: 'Fields with a yellow border still contain placeholders such as [to be added].' }), save]));
      form.onsubmit = function (e) {
        e.preventDefault();
        var body = {};
        data.fields.forEach(function (f) { var i = form.elements[f.key]; body[f.key] = f.type === 'boolean' ? i.checked : i.value; });
        $$('[data-err]').forEach(function (p) { p.textContent = ''; });
        save.disabled = true;
        api('PUT', '/content', body).then(function (d) {
          save.disabled = false;
          if (d.ok) { toast('Saved. The website has been updated.'); loadContent(); loadCounts(); return; }
          toast(d.error || 'Please fix the fields marked in red.', true);
          var first;
          Object.keys(d.errors || {}).forEach(function (k) { var p = $('[data-err="' + k + '"]'); if (p) { p.textContent = d.errors[k]; first = first || p; } });
          if (first) first.scrollIntoView({ block: 'center' });
        });
      };
    });
  }

  // ---------- activity log ----------
  function loadAudit() {
    api('GET', '/audit').then(function (data) {
      var tbody = $('[data-audit]');
      tbody.textContent = '';
      if (!(data.items || []).length) { tbody.appendChild(el('tr', {}, [el('td', { colspan: '4', class: 'empty', text: 'No activity yet.' })])); return; }
      data.items.forEach(function (a) {
        var act = ACTIONS[a.action] || [a.action, ''];
        tbody.appendChild(el('tr', {}, [
          el('td', { text: fmtDate(a.at) }), el('td', { text: a.actor }),
          el('td', {}, [el('span', { class: 'act' + (act[1] ? ' act-' + act[1] : ''), text: act[0] })]),
          el('td', { text: a.detail || '' }),
        ]));
      });
    });
  }

  // ---------- events ----------
  document.addEventListener('DOMContentLoaded', function () {
    // Show / hide the password while typing. It is always hidden again when the form is sent.
    var pwToggle = $('[data-password-toggle]');
    function showPassword(on) {
      var label = on ? 'Hide password' : 'Show password';
      $('#p').type = on ? 'text' : 'password';
      pwToggle.setAttribute('aria-pressed', String(on));
      pwToggle.setAttribute('aria-label', label);
      pwToggle.title = label;
      $('use', pwToggle).setAttribute('href', on ? '#a-eye-off' : '#a-eye');
    }
    pwToggle.addEventListener('click', function () {
      showPassword($('#p').type === 'password');
      $('#p').focus();
    });

    $('[data-login]').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var msg = $('[data-login-msg]');
      msg.textContent = '';
      showPassword(false);
      api('POST', '/login', { username: f.username.value.trim(), password: f.password.value }).then(function (d) {
        if (d.ok) { f.password.value = ''; state.tab = 'dashboard'; show(true, d.user); } else msg.textContent = d.error || 'Login failed.';
      }).catch(function () { msg.textContent = 'Could not reach the server.'; });
    });
    $('[data-logout]').addEventListener('click', function () { api('POST', '/logout').then(function () { show(false); toast('Logged out.'); }); });
    $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { state.selected = null; state.filter = ''; state.search = ''; openTab(b.dataset.tab); }); });
    $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { state.selected = null; openTab(b.dataset.go); }); });
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.dataset.filter;
        $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        renderList();
      });
    });
    $('[data-search]').addEventListener('input', function (e) { state.search = e.target.value; renderList(); });
    $('[data-refresh]').addEventListener('click', function () { loadType(state.tab).then(function () { renderList(); toast('List updated.'); }); });
    $('[data-export]').addEventListener('click', function () {
      download('/api/admin/export/' + state.tab).then(function () { toast('CSV downloaded. Open it in Excel or Google Sheets.'); })
        .catch(function () { toast('Could not export.', true); });
    });
    api('GET', '/me').then(function (d) { show(!!d.ok, d.user); }).catch(function () { show(false); });
  });
})();
