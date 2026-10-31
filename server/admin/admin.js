/* GS Manpower admin panel. All record data is inserted with textContent, never as HTML. */
(function () {
  'use strict';
  var state = { tab: 'enquiry', items: [], selected: null };
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var LABELS = {
    organisation: 'Organisation', contact_name: 'Contact person', full_name: 'Full name', phone: 'Mobile', email: 'Email',
    role: 'Role', worker_count: 'Workers', location: 'Location', timeline: 'Needed', shifts: 'Shifts', notes: 'Notes',
    experience: 'Experience', availability: 'Can join', lang: 'Form language', createdAt: 'Received', consentAt: 'Consent given',
    status: 'Status', updatedAt: 'Last updated', note: 'Internal note',
  };
  var STATUS = { 'new': 'New', contacted: 'Contacted', 'in-progress': 'In progress', closed: 'Closed' };

  function api(method, url, body) {
    var opts = { method: method, headers: { 'X-GSM-Admin': '1' }, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch('/api/admin' + url, opts).then(function (res) {
      if (res.status === 401 && url !== '/login') { show(false); throw new Error('Please log in again.'); }
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
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  var fmtDate = function (iso) { return iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''; };
  var statusBadge = function (s) { return el('span', { class: 'status status-' + s, text: STATUS[s] || s }); };

  function show(loggedIn, user) {
    $$('[data-when="in"]').forEach(function (n) { n.hidden = !loggedIn; });
    $$('[data-when="out"]').forEach(function (n) { n.hidden = loggedIn; });
    if (loggedIn) { $('[data-user]').textContent = 'Logged in as ' + user; openTab(state.tab); }
    else { setTimeout(function () { var u = $('#u'); if (u) u.focus(); }, 0); }
  }

  // ---------- leads ----------
  function loadLeads() {
    var type = state.tab;
    return api('GET', '/leads/' + type).then(function (data) {
      state.items = data.items || [];
      var newCount = state.items.filter(function (i) { return i.status === 'new'; }).length;
      $('[data-count="' + type + '"]').textContent = newCount ? String(newCount) : '';
      renderList();
    });
  }

  function renderList() {
    var list = $('[data-list]');
    var filter = $('[data-filter]').value;
    list.textContent = '';
    var items = state.items.filter(function (i) { return !filter || i.status === filter; });
    if (!items.length) { list.appendChild(el('p', { class: 'empty', text: 'No records.' })); return; }
    items.forEach(function (i) {
      var title = state.tab === 'enquiry' ? i.organisation : i.full_name;
      var sub = state.tab === 'enquiry' ? i.worker_count + ' × ' + i.role + ' · ' + i.location : i.role + ' · ' + i.experience;
      var row = el('button', { type: 'button', class: 'row', 'aria-current': String(state.selected === i.id) }, [
        el('strong', {}, [document.createTextNode(title), statusBadge(i.status)]),
        el('small', { text: sub }), el('br'), el('small', { text: fmtDate(i.createdAt) }),
      ]);
      row.addEventListener('click', function () { openDetail(i.id); });
      list.appendChild(row);
    });
  }

  function openDetail(id) {
    state.selected = id;
    renderList();
    var type = state.tab;
    api('GET', '/leads/' + type + '/' + id).then(function (data) {
      var r = data.item;
      var box = $('[data-detail]');
      box.textContent = '';
      box.appendChild(el('h2', { text: type === 'enquiry' ? r.organisation : r.full_name }));
      var dl = el('dl', { class: 'fields' });
      var keys = type === 'enquiry'
        ? ['contact_name', 'phone', 'email', 'role', 'worker_count', 'location', 'timeline', 'shifts', 'notes', 'lang', 'createdAt', 'consentAt', 'updatedAt']
        : ['phone', 'role', 'experience', 'location', 'availability', 'lang', 'createdAt', 'consentAt', 'updatedAt'];
      keys.forEach(function (k) {
        var v = r[k];
        if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return;
        if (k === 'createdAt' || k === 'consentAt' || k === 'updatedAt') v = fmtDate(v);
        if (k === 'lang') v = v === 'mr' ? 'Marathi' : 'English';
        dl.appendChild(el('dt', { text: LABELS[k] || k }));
        var dd = el('dd');
        if (k === 'phone') dd.appendChild(el('a', { href: 'tel:' + String(v).replace(/\s/g, ''), text: v }));
        else if (k === 'email') dd.appendChild(el('a', { href: 'mailto:' + v, text: v }));
        else dd.textContent = Array.isArray(v) ? v.join(', ') : String(v);
        dl.appendChild(dd);
      });
      box.appendChild(dl);

      if (r.resume) {
        box.appendChild(el('p', {}, [el('a', { class: 'btn btn-navy', href: '/api/admin/leads/application/' + id + '/resume', 'data-download': '' , text: 'Download resume (' + r.resume.ext.toUpperCase() + ', ' + Math.ceil(r.resume.size / 1024) + ' KB)' })]));
      }

      var select = el('select', { id: 'st' });
      Object.keys(STATUS).forEach(function (s) { var o = el('option', { value: s, text: STATUS[s] }); if (s === r.status) o.selected = true; select.appendChild(o); });
      var note = el('textarea', { id: 'nt', maxlength: '2000' }); note.value = r.note || '';
      var msg = el('p', { class: 'msg', role: 'status' });
      var save = el('button', { type: 'button', class: 'btn btn-primary', text: 'Save' });
      var del = el('button', { type: 'button', class: 'btn btn-danger', text: 'Delete permanently' });
      box.appendChild(el('div', { class: 'edit-grid' }, [
        el('label', { for: 'st', text: 'Status' }), select,
        el('label', { for: 'nt', text: 'Internal note (not shown to the applicant)' }), note,
      ]));
      box.appendChild(el('div', { class: 'actions' }, [save, del, msg]));

      save.addEventListener('click', function () {
        api('PATCH', '/leads/' + type + '/' + id, { status: select.value, note: note.value }).then(function (d) {
          msg.className = d.ok ? 'msg ok' : 'msg'; msg.textContent = d.ok ? 'Saved.' : 'Could not save.';
          loadLeads();
        });
      });
      del.addEventListener('click', function () {
        if (!window.confirm('Delete this record permanently? Use this when the person asks for their data to be deleted. This cannot be undone.')) return;
        api('DELETE', '/leads/' + type + '/' + id).then(function () {
          state.selected = null;
          $('[data-detail]').textContent = '';
          $('[data-detail]').appendChild(el('p', { class: 'muted', text: 'Record deleted.' }));
          loadLeads();
        });
      });
    });
  }

  // Resume downloads need the custom header, so fetch them as a blob.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-download]');
    if (!a) return;
    e.preventDefault();
    fetch(a.getAttribute('href'), { headers: { 'X-GSM-Admin': '1' }, credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error();
        var name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '') || [])[1] || 'resume';
        return res.blob().then(function (b) {
          var url = URL.createObjectURL(b);
          var tmp = el('a', { href: url, download: name });
          document.body.appendChild(tmp); tmp.click(); tmp.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
      })
      .catch(function () { window.alert('Could not download the resume.'); });
  });

  // ---------- website settings ----------
  function loadContent() {
    api('GET', '/content').then(function (data) {
      var form = $('[data-content]');
      form.textContent = '';
      var groups = {};
      data.fields.forEach(function (f) {
        if (!groups[f.group]) { groups[f.group] = el('fieldset', { class: 'settings-group' }, [el('legend', { text: f.group })]); form.appendChild(groups[f.group]); }
        var id = 'f-' + f.key.replace('.', '-');
        var input;
        if (f.type === 'boolean') { input = el('input', { type: 'checkbox', id: id, name: f.key }); input.checked = !!data.values[f.key]; }
        else {
          input = el('input', { id: id, name: f.key });
          input.value = data.values[f.key];
          if (f.example) input.placeholder = f.example;
          if (/^\[.*\]$|\[.*\]/.test(input.value)) input.classList.add('placeholder-value');
        }
        groups[f.group].appendChild(el('div', { class: 'setting' }, [el('label', { for: id, text: f.label }), input, el('p', { class: 'err', 'data-err': f.key })]));
      });
      var msg = el('p', { class: 'msg', role: 'status' });
      var save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save and publish' });
      form.appendChild(el('div', { class: 'actions' }, [save, msg]));
      form.onsubmit = function (e) {
        e.preventDefault();
        var body = {};
        data.fields.forEach(function (f) { var i = form.elements[f.key]; body[f.key] = f.type === 'boolean' ? i.checked : i.value; });
        $$('[data-err]').forEach(function (p) { p.textContent = ''; });
        save.disabled = true;
        api('PUT', '/content', body).then(function (d) {
          save.disabled = false;
          if (d.ok) { msg.className = 'msg ok'; msg.textContent = 'Saved. The website has been updated.'; loadContent(); return; }
          msg.className = 'msg'; msg.textContent = d.error || 'Please fix the highlighted fields.';
          Object.keys(d.errors || {}).forEach(function (k) { var p = $('[data-err="' + k + '"]'); if (p) p.textContent = d.errors[k]; });
        });
      };
    });
  }

  function loadAudit() {
    api('GET', '/audit').then(function (data) {
      var tbody = $('[data-audit]');
      tbody.textContent = '';
      (data.items || []).forEach(function (a) {
        tbody.appendChild(el('tr', {}, [el('td', { text: fmtDate(a.at) }), el('td', { text: a.actor }), el('td', { text: a.action }), el('td', { text: a.detail || '' })]));
      });
    });
  }

  function openTab(tab) {
    state.tab = tab;
    state.selected = null;
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    var isLeads = tab === 'enquiry' || tab === 'application';
    $('[data-panel="leads"]').hidden = !isLeads;
    $('[data-panel="content"]').hidden = tab !== 'content';
    $('[data-panel="audit"]').hidden = tab !== 'audit';
    if (isLeads) {
      $('[data-detail]').textContent = '';
      $('[data-detail]').appendChild(el('p', { class: 'muted', text: 'Select a record to see the details.' }));
      loadLeads();
    } else if (tab === 'content') loadContent();
    else loadAudit();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('[data-login]').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var msg = $('[data-login-msg]');
      msg.textContent = '';
      api('POST', '/login', { username: f.username.value, password: f.password.value }).then(function (d) {
        if (d.ok) { f.password.value = ''; show(true, d.user); } else msg.textContent = d.error || 'Login failed.';
      }).catch(function () { msg.textContent = 'Could not reach the server.'; });
    });
    $('[data-logout]').addEventListener('click', function () { api('POST', '/logout').then(function () { show(false); }); });
    $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { openTab(b.dataset.tab); }); });
    $('[data-filter]').addEventListener('change', renderList);
    $('[data-refresh]').addEventListener('click', loadLeads);
    api('GET', '/me').then(function (d) { show(!!d.ok, d.user); }).catch(function () { show(false); });
  });
})();
