/* ============================================================
   ui.js — small reusable interface pieces
   ------------------------------------------------------------
   Icons, status badges, toasts, modals, confirmation dialogs,
   empty states and the shared table builder. No business rules live here.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});
  var esc = T.util.escapeHtml;
  var fmt = T.util.formatNaira;

  /* ---------- Icons (simple outline paths, 24x24) ---------- */
  var ICONS = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    payments: '<path d="M4 3h16v18l-3-2-2.5 2L12 19l-2.5 2L7 19l-3 2z"/><path d="M8 8h8M8 12h8"/>',
    reconcile: '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
    students: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14c2.2.6 3.5 2.6 3.5 6"/>',
    clearance: '<path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.8-6 8-6s7.3 2 8 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'
  };

  T.icon = function (name, size) {
    var s = size || 18;
    return '<svg class="icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------- Badges: colour AND words, so status never relies on colour alone ---------- */
  function badge(tone, label) {
    return '<span class="badge badge--' + tone + '"><span class="badge__dot" aria-hidden="true"></span>' + esc(label) + '</span>';
  }

  T.badgeForTransaction = function (status) {
    return status === 'reconciled' ? badge('green', 'Reconciled') : badge('amber', 'Unmatched');
  };

  T.badgeForClearance = function (fin) {
    var tone = fin.status === 'cleared' ? 'green' : fin.status === 'partial' ? 'amber' : 'neutral';
    var html = badge(tone, T.CLEARANCE_LABELS[fin.status]);
    if (fin.overpaid) html += ' ' + badge('navy', 'Overpayment');
    return html;
  };

  /* ---------- Reference code chip with copy ---------- */
  T.codeChip = function (code) {
    return '<span class="code-chip"><code class="mono">' + esc(code) + '</code>' +
      '<button type="button" class="icon-btn icon-btn--sm" data-action="copy-code" data-code="' + esc(code) + '" aria-label="Copy reference code ' + esc(code) + '">' + T.icon('copy', 15) + '</button></span>';
  };

  T.emptyState = function (title, text, actionHtml) {
    return '<div class="empty"><div class="empty__icon">' + T.icon('inbox', 26) + '</div><h3 class="empty__title">' + esc(title) + '</h3>' +
      (text ? '<p class="empty__text">' + esc(text) + '</p>' : '') + (actionHtml || '') + '</div>';
  };

  T.statCard = function (label, value, hint, tone) {
    return '<div class="stat' + (tone ? ' stat--' + tone : '') + '"><p class="stat__label">' + esc(label) + '</p><p class="stat__value num">' + value + '</p>' +
      (hint ? '<p class="stat__hint">' + hint + '</p>' : '') + '</div>';
  };

  /**
   * Shared table builder. Each column: { label, key?, cls?, render?(row) }.
   * Cells carry data-label so the same table becomes stacked cards on phones.
   */
  T.table = function (columns, rows, opts) {
    var o = opts || {};
    var head = columns.map(function (c) {
      return '<th scope="col" class="' + (c.cls || '') + '">' + esc(c.label) + '</th>';
    }).join('');
    var body = rows.map(function (row) {
      var attrs = o.rowAttrs ? o.rowAttrs(row) : '';
      var cells = columns.map(function (c) {
        return '<td class="' + (c.cls || '') + '" data-label="' + esc(c.label) + '">' + (c.render ? c.render(row) : esc(row[c.key])) + '</td>';
      }).join('');
      return '<tr ' + attrs + '>' + cells + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="table"><caption class="sr-only">' + esc(o.caption || '') + '</caption><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  };

  /** Cell helpers shared by several tables */
  T.cells = {
    txId: function (t) {
      return '<button type="button" class="link-btn mono" data-action="view-tx" data-id="' + esc(t.id) + '">' + esc(t.transactionId) + '</button>';
    },
    code: function (t) {
      return '<span class="mono small">' + esc(t.referenceCode) + '</span>';
    },
    amount: function (t) {
      return '<span class="num strong">' + fmt(t.amountKobo) + '</span>';
    },
    date: function (t) {
      return esc(T.util.formatDate(t.date)) + ' <span class="muted small">' + esc(t.time) + '</span>';
    },
    student: function (t) {
      var s = t.studentId ? T.getStudent(t.studentId) : null;
      return s
        ? '<button type="button" class="link-btn" data-action="view-student" data-id="' + esc(s.id) + '">' + esc(s.fullName) + '</button>'
        : '<span class="muted">Not assigned</span>';
    }
  };

  /* ---------- Toasts ---------- */
  T.toast = function (type, message) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    var icon = type === 'success' ? 'check' : type === 'warning' || type === 'error' ? 'alert' : 'info';
    el.innerHTML = '<span class="toast__icon">' + T.icon(icon, 18) + '</span><span class="toast__msg">' + esc(message) + '</span>' +
      '<button type="button" class="toast__close" aria-label="Dismiss message">' + T.icon('x', 16) + '</button>';
    root.appendChild(el);
    var remove = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    el.querySelector('.toast__close').addEventListener('click', remove);
    setTimeout(remove, type === 'error' ? 7000 : 4800);
  };

  /* ---------- Modals (a small stack so a confirmation can sit on top of a form) ---------- */
  var stack = [];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  T.openModal = function (opts) {
    var root = document.getElementById('modal-root');
    var id = 'modal-title-' + (stack.length + 1) + '-' + Date.now();
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal modal--' + (opts.size || 'md') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
      '<div class="modal__head"><h2 class="modal__title" id="' + id + '">' + esc(opts.title || '') + '</h2>' +
      '<button type="button" class="icon-btn" data-modal-close aria-label="Close dialog">' + T.icon('x', 18) + '</button></div>' +
      '<div class="modal__body">' + opts.body + '</div></div>';
    root.appendChild(backdrop);
    document.body.classList.add('modal-open');

    var handle = {
      el: backdrop,
      opener: document.activeElement,
      body: backdrop.querySelector('.modal__body'),
      setTitle: function (t) { backdrop.querySelector('.modal__title').textContent = t; },
      setBody: function (html) { handle.body.innerHTML = html; focusFirst(backdrop); },
      close: function () { closeHandle(handle); }
    };
    stack.push(handle);

    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) handle.close();
    });
    backdrop.querySelector('[data-modal-close]').addEventListener('click', function () { handle.close(); });
    focusFirst(backdrop);
    return handle;
  };

  function focusFirst(container) {
    var body = container.querySelector('.modal__body');
    var target = container.querySelector('[data-autofocus]') || (body && body.querySelector(FOCUSABLE)) || container.querySelector('[data-modal-close]');
    if (target) target.focus();
  }

  function closeHandle(handle) {
    var idx = stack.indexOf(handle);
    if (idx === -1) return;
    stack.splice(idx, 1);
    if (handle.el.parentNode) handle.el.parentNode.removeChild(handle.el);
    if (stack.length === 0) document.body.classList.remove('modal-open');
    if (handle.opener && document.body.contains(handle.opener) && handle.opener.focus) handle.opener.focus();
  }

  T.closeTopModal = function () {
    if (stack.length) stack[stack.length - 1].close();
  };

  T.closeAllModals = function () {
    while (stack.length) stack[stack.length - 1].close();
  };

  // Keyboard: Escape closes the top dialog, Tab stays inside it.
  document.addEventListener('keydown', function (e) {
    if (!stack.length) return;
    var top = stack[stack.length - 1];
    if (e.key === 'Escape') {
      e.preventDefault();
      top.close();
      return;
    }
    if (e.key === 'Tab') {
      var items = Array.prototype.slice.call(top.el.querySelectorAll(FOCUSABLE));
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /** Confirmation dialog: explains the action, runs onConfirm only if the person agrees. */
  T.confirmDialog = function (opts) {
    var handle = T.openModal({
      title: opts.title,
      size: 'sm',
      body: '<p class="modal__text">' + opts.message + '</p>' +
        '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-confirm-cancel>' + esc(opts.cancelLabel || 'Cancel') + '</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-confirm-ok data-autofocus>' + esc(opts.confirmLabel || 'Confirm') + '</button></div>'
    });
    handle.el.querySelector('[data-confirm-cancel]').addEventListener('click', function () { handle.close(); });
    handle.el.querySelector('[data-confirm-ok]').addEventListener('click', function () {
      handle.close();
      opts.onConfirm();
    });
    return handle;
  };

  /* ---------- Copy to clipboard (with a fallback for older browsers) ---------- */
  T.copyText = function (text, successMessage) {
    function done() { T.toast('success', successMessage || 'Copied to clipboard.'); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done(); else T.toast('error', 'Copy failed. Please select the code and copy it manually.');
      } catch (err) {
        T.toast('error', 'Copy failed. Please select the code and copy it manually.');
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  };
})();
