/* GS Manpower Services – site behaviour: navigation, forms, consent-based analytics. No dependencies. */
(function () {
  'use strict';
  var CONFIG = window.GSMS_CONFIG || {};
  var CONSENT_KEY = 'gsms-analytics-consent';

  function storageGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
  function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  /* ---------- Navigation ---------- */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    var header = document.querySelector('[data-header]');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    }
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) { if (mq.matches) setOpen(false); });

    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Forms ---------- */
  var LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'mr' ? 'mr' : 'en';
  var T = {
    en: {
      valueMissing: 'Please fill this in.',
      typeMismatch: 'Please check the format.',
      patternMismatch: 'Please check the format.',
      rangeUnderflow: 'Please enter a larger number.',
      rangeOverflow: 'Please enter a smaller number.',
      tick: 'Please tick this box to continue.',
      group: 'Please choose at least one option.',
      fileType: 'Please upload a PDF or Word file.',
      fileSize: function (mb) { return 'This file is larger than ' + mb + ' MB.'; },
      fixOne: 'Please check the highlighted field.',
      fixMany: function (n) { return 'Please check the ' + n + ' highlighted fields.'; },
      preview: ' <em>(Preview mode: no server is connected yet, so nothing was sent.)</em>',
      failed: function (phone) { return 'Sorry, we could not send this right now. Please try again, or call us on ' + phone + '.'; },
      busy: 'Too many attempts from this connection. Please call us instead.',
      office: 'our office number',
    },
    mr: {
      valueMissing: 'कृपया ही माहिती भरा.',
      typeMismatch: 'कृपया योग्य स्वरूपात लिहा.',
      patternMismatch: 'कृपया योग्य स्वरूपात लिहा.',
      rangeUnderflow: 'कृपया मोठी संख्या लिहा.',
      rangeOverflow: 'कृपया लहान संख्या लिहा.',
      tick: 'पुढे जाण्यासाठी कृपया हा बॉक्स निवडा.',
      group: 'कृपया किमान एक पर्याय निवडा.',
      fileType: 'कृपया PDF किंवा Word फाइल अपलोड करा.',
      fileSize: function (mb) { return 'ही फाइल ' + mb + ' MB पेक्षा मोठी आहे.'; },
      fixOne: 'कृपया लाल रंगातील माहिती तपासा.',
      fixMany: function (n) { return 'कृपया लाल रंगातील ' + n + ' माहिती तपासा.'; },
      preview: ' <em>(चाचणी मोड: सर्व्हर जोडलेला नाही, त्यामुळे काहीही पाठवले गेले नाही.)</em>',
      failed: function (phone) { return 'माफ करा, आत्ता पाठवता आले नाही. कृपया पुन्हा प्रयत्न करा किंवा ' + phone + ' वर कॉल करा.'; },
      busy: 'खूप वेळा प्रयत्न झाले. कृपया आम्हाला कॉल करा.',
      office: 'आमच्या कार्यालयाच्या नंबरवर',
    },
  }[LANG];

  function fieldOf(el) { return el.closest('.field') || el.parentElement; }

  function setError(el, message) {
    var field = fieldOf(el);
    field.classList.add('has-error');
    var id = (el.id || el.name) + '-error';
    if (document.getElementById(id)) return;
    var p = document.createElement('p');
    p.className = 'field-error';
    p.id = id;
    p.innerHTML = icon('alert') + '<span></span>';
    p.querySelector('span').textContent = message;
    field.appendChild(p);
    var described = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (described.indexOf(id) === -1) described.push(id);
    el.setAttribute('aria-describedby', described.join(' '));
    if (!el.matches('fieldset')) el.setAttribute('aria-invalid', 'true');
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(function (p) {
      var owner = form.querySelector('[aria-describedby~="' + p.id + '"]');
      if (owner) {
        var rest = owner.getAttribute('aria-describedby').split(' ').filter(function (x) { return x !== p.id; });
        rest.length ? owner.setAttribute('aria-describedby', rest.join(' ')) : owner.removeAttribute('aria-describedby');
      }
      p.remove();
    });
    form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function validate(form) {
    var invalid = [];
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'hidden' || el.closest('.hp-field') || el.closest('[data-required-group]')) return;
      if (!el.checkValidity()) {
        var key = ['valueMissing', 'typeMismatch', 'patternMismatch', 'rangeUnderflow', 'rangeOverflow'].find(function (k) { return el.validity[k]; });
        var msg = el.dataset.error || T[key] || T.typeMismatch;
        if (el.type === 'checkbox' && el.validity.valueMissing) msg = el.dataset.error || T.tick;
        setError(el, msg);
        invalid.push(el);
        return;
      }
      if (el.type === 'file' && el.files && el.files[0]) {
        var file = el.files[0];
        var maxMb = Number(el.dataset.maxMb || 5);
        var allowed = (el.getAttribute('accept') || '').split(',').map(function (s) { return s.trim().toLowerCase(); });
        var ext = '.' + file.name.split('.').pop().toLowerCase();
        if (allowed.length && allowed.indexOf(ext) === -1) { setError(el, T.fileType); invalid.push(el); }
        else if (file.size > maxMb * 1024 * 1024) { setError(el, T.fileSize(maxMb)); invalid.push(el); }
      }
    });
    form.querySelectorAll('[data-required-group]').forEach(function (group) {
      if (!group.querySelector('input:checked')) {
        setError(group, group.dataset.error || T.group);
        invalid.push(group.querySelector('input'));
      }
    });
    return invalid;
  }

  // Shows errors returned by the server (it repeats every check) next to the matching fields.
  function showServerErrors(form, errors) {
    var invalid = [];
    Object.keys(errors).forEach(function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      if (!el) return;
      var group = el.closest('[data-required-group]');
      setError(group || el, (group && group.dataset.error) || el.dataset.error || errors[name]);
      invalid.push(el);
    });
    return invalid;
  }

  function showStatus(form, type, html) {
    var box = form.querySelector('[data-form-status]');
    if (!box) return;
    box.className = 'notice form-status form-status--' + type + ' is-visible';
    box.innerHTML = icon(type === 'success' ? 'check' : 'alert') + '<p>' + html + '</p>';
    box.focus();
  }

  function initForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var startedAt = Date.now();
      var button = form.querySelector('[type="submit"]');
      form.setAttribute('novalidate', '');
      form.querySelector('[name="started_at"]').value = String(startedAt);
      var langField = form.querySelector('[name="lang"]');
      if (langField) langField.value = LANG;

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors(form);
        var invalid = validate(form);
        if (invalid.length) {
          showStatus(form, 'error', invalid.length === 1 ? T.fixOne : T.fixMany(invalid.length));
          invalid[0].focus();
          return;
        }

        // Spam protection, part 1 (the server repeats these checks): honeypot and minimum fill time.
        var trap = form.querySelector('.hp-field input');
        if ((trap && trap.value) || Date.now() - startedAt < 3000) {
          showStatus(form, 'success', form.dataset.success);
          form.reset();
          return;
        }

        var endpoint = form.dataset.endpoint;
        if (!endpoint || window.location.protocol === 'file:') {
          showStatus(form, 'success', form.dataset.success + T.preview);
          form.reset();
          return;
        }

        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, credentials: 'same-origin' })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
              if (res.ok && data.ok !== false) {
                showStatus(form, 'success', form.dataset.success);
                form.reset();
                form.querySelector('[name="started_at"]').value = String(startedAt);
                if (langField) langField.value = LANG;
                trackEvent('generate_lead', { form_name: form.dataset.form });
                return;
              }
              if (res.status === 422 && data.errors) {
                var bad = showServerErrors(form, data.errors);
                showStatus(form, 'error', bad.length === 1 ? T.fixOne : T.fixMany(bad.length));
                return;
              }
              if (res.status === 429) { showStatus(form, 'error', T.busy); return; }
              throw new Error('HTTP ' + res.status);
            });
          })
          .catch(function () {
            showStatus(form, 'error', T.failed(CONFIG.phoneDisplay || T.office));
          })
          .finally(function () { button.disabled = false; button.removeAttribute('aria-busy'); });
      });
    });
  }


  /* ---------- Consent and analytics (GA4 loads only after an explicit "Allow") ---------- */
  function loadAnalytics() {
    if (!CONFIG.ga4Id || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4Id, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ga4Id);
    document.head.appendChild(s);
  }

  function trackEvent(name, params) { if (window.gtag && storageGet(CONSENT_KEY) === 'granted') window.gtag('event', name, params || {}); }

  function initConsent() {
    var banner = document.querySelector('[data-consent]');
    var reopen = document.querySelector('[data-consent-open]');
    if (!banner || !CONFIG.ga4Id) return; // no analytics configured → no cookies → no banner
    if (reopen) reopen.hidden = false;

    var choice = storageGet(CONSENT_KEY);
    if (choice === 'granted') loadAnalytics();
    if (!choice) banner.hidden = false;

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent-choice]');
      if (!btn) return;
      var value = btn.dataset.consentChoice;
      storageSet(CONSENT_KEY, value);
      banner.hidden = true;
      if (value === 'granted') loadAnalytics();
      else if (window.gtag) window.location.reload(); // unload analytics that was running
    });
    if (reopen) reopen.addEventListener('click', function () { banner.hidden = false; banner.querySelector('button').focus(); });
  }

  function initWhatsApp() {
    document.querySelectorAll('[data-whatsapp]').forEach(function (a) {
      a.addEventListener('click', function () { trackEvent('contact_whatsapp'); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initForms();
    initConsent();
    initWhatsApp();
  });
})();
