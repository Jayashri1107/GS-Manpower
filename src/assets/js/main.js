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
  var MESSAGES = {
    valueMissing: 'Please fill this in.',
    typeMismatch: 'Please check the format.',
    patternMismatch: 'Please check the format.',
    rangeUnderflow: 'Please enter a larger number.',
    rangeOverflow: 'Please enter a smaller number.',
  };

  function fieldOf(el) { return el.closest('.field') || el.parentElement; }

  function setError(el, message) {
    var field = fieldOf(el);
    field.classList.add('has-error');
    var id = (el.id || el.name) + '-error';
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
        var key = Object.keys(MESSAGES).find(function (k) { return el.validity[k]; });
        var msg = el.dataset.error || MESSAGES[key] || 'Please check this field.';
        if (el.type === 'checkbox' && el.validity.valueMissing) msg = el.dataset.error || 'Please tick this box to continue.';
        setError(el, msg);
        invalid.push(el);
        return;
      }
      if (el.type === 'file' && el.files && el.files[0]) {
        var file = el.files[0];
        var maxMb = Number(el.dataset.maxMb || 5);
        var allowed = (el.getAttribute('accept') || '').split(',').map(function (s) { return s.trim().toLowerCase(); });
        var ext = '.' + file.name.split('.').pop().toLowerCase();
        if (allowed.length && allowed.indexOf(ext) === -1) { setError(el, 'Please upload a PDF or Word file.'); invalid.push(el); }
        else if (file.size > maxMb * 1024 * 1024) { setError(el, 'This file is larger than ' + maxMb + ' MB.'); invalid.push(el); }
      }
    });
    form.querySelectorAll('[data-required-group]').forEach(function (group) {
      if (!group.querySelector('input:checked')) {
        setError(group, group.dataset.error || 'Please choose at least one option.');
        invalid.push(group.querySelector('input'));
      }
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

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors(form);
        var invalid = validate(form);
        if (invalid.length) {
          showStatus(form, 'error', invalid.length === 1 ? 'Please check the highlighted field.' : 'Please check the ' + invalid.length + ' highlighted fields.');
          invalid[0].focus();
          return;
        }

        // Spam protection, part 1 (the server must repeat these checks): honeypot and minimum fill time.
        var trap = form.querySelector('.hp-field input');
        if ((trap && trap.value) || Date.now() - startedAt < 3000) {
          showStatus(form, 'success', form.dataset.success);
          form.reset();
          return;
        }

        var endpoint = form.dataset.endpoint;
        if (!endpoint) {
          showStatus(form, 'success', form.dataset.success + ' <em>(Preview mode: no server is connected yet, so nothing was sent.)</em>');
          form.reset();
          return;
        }

        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, credentials: 'omit' })
          .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); })
          .then(function () {
            showStatus(form, 'success', form.dataset.success);
            form.reset();
            trackEvent('generate_lead', { form_name: form.dataset.form });
          })
          .catch(function () {
            showStatus(form, 'error', 'Sorry, we could not send this right now. Please try again, or call us on ' + (CONFIG.phoneDisplay || 'our office number') + '.');
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
