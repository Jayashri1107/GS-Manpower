// Responsive check, run in the browser console (or by an automated browser) on any page.
// Reports sideways overflow, elements sticking out of the screen, small tap targets and tiny text.
// Usage: paste into DevTools console, or load with a bookmarklet; returns a JSON summary.
(function () {
  const W = window.innerWidth;
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const scrollsSideways = (el) => el.closest('.toc, .filters, .side-nav, .table-card, .choice-row');
  const label = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '"';

  const sticking = [...document.querySelectorAll('main *, header *, footer *')]
    .filter((el) => visible(el) && !scrollsSideways(el))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.right > W + 1 || r.left < -1; })
    .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= W + 1) // report outermost only
    .slice(0, 8).map(label);

  const smallTargets = [...document.querySelectorAll('a, button, input, select, textarea, summary')]
    .filter((el) => visible(el) && !el.closest('p, li span, .breadcrumb, .footer-links, .lang-switch, .hp-field, .footer-bottom'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.height < 40 && !(el.type === 'checkbox'); })
    .slice(0, 8).map((el) => label(el) + ' h=' + Math.round(el.getBoundingClientRect().height));

  const tinyText = [...document.querySelectorAll('main p, main span, main li, main small, main label, main a')]
    .filter((el) => visible(el) && el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
    .slice(0, 5).map((el) => label(el) + ' ' + getComputedStyle(el).fontSize);

  return JSON.stringify({
    width: W,
    page: location.pathname,
    overflowX: document.documentElement.scrollWidth > W,
    height: document.documentElement.scrollHeight,
    sticking, smallTargets, tinyText,
  });
})();
