/* ============================================================
   app.js — starts the application and wires up every click and form
   ------------------------------------------------------------
   Instead of attaching a listener to every button, we listen on the
   whole document and look at the data-action attribute of what was
   clicked ("event delegation"). That keeps this file short and means
   buttons created later still work.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});
  var esc = T.util.escapeHtml;

  function byId(id) {
    return document.getElementById(id);
  }

  /* ---------- Clicks ---------- */
  document.addEventListener('click', function (e) {
    var closeBtn = e.target.closest('[data-modal-close-btn]');
    if (closeBtn) {
      if (closeBtn.tagName === 'A') T.closeAllModals(); // let the link navigate
      else T.closeTopModal();
      return;
    }

    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');

    switch (action) {
      case 'copy-code':
        T.copyText(el.getAttribute('data-code'), 'Reference code copied.');
        break;

      case 'dismiss-banner':
        try { window.sessionStorage.setItem('tuitia.bannerDismissed', '1'); } catch (err) { /* ignore */ }
        T.refreshPage();
        break;

      case 'view-tx':
        T.openTransactionModal(el.getAttribute('data-id'));
        break;

      case 'view-student':
        T.openStudentModal(el.getAttribute('data-id'));
        break;

      case 'review-unmatched':
        T.closeAllModals();
        T.openReviewModal(el.getAttribute('data-id'));
        break;

      case 'open-simulate': {
        var mode = el.getAttribute('data-mode');
        var code = el.getAttribute('data-code');
        T.closeAllModals();
        T.openSimulateModal(mode, el.getAttribute('data-student'));
        if (code && byId('sim-code')) byId('sim-code').value = code;
        break;
      }

      case 'simulate-again': {
        var modal = el.closest('.modal__body');
        var m = el.getAttribute('data-mode');
        var sid = el.getAttribute('data-student');
        if (modal) {
          // Reopen the same form in the same dialog
          T.closeTopModal();
          T.openSimulateModal(m, sid);
        }
        break;
      }

      case 'unlock-code': {
        var input = byId('sim-code');
        if (input) {
          input.readOnly = !el.checked;
          if (el.checked) { input.focus(); input.select(); }
        }
        break;
      }

      case 'new-txn-id': {
        var ch = byId('sim-channel');
        byId('sim-txn').value = T.generateTransactionId(ch ? ch.value : 'Paystack');
        break;
      }

      case 'page': {
        var view = el.getAttribute('data-view');
        T.ui[view].page += parseInt(el.getAttribute('data-dir'), 10);
        T.refreshResults(view);
        break;
      }

      case 'clear-filters': {
        var v = el.getAttribute('data-view');
        if (v === 'payments') T.ui.payments = { q: '', status: '', source: '', channel: '', sort: '', page: 1 };
        if (v === 'students') T.ui.students = { q: '', faculty: '', department: '', status: '', page: 1 };
        T.refreshPage();
        break;
      }

      case 'clearance-tab':
        T.ui.clearance.filter = el.getAttribute('data-filter');
        T.refreshResults('clearance');
        break;

      case 'reset-demo':
        T.confirmDialog({
          title: 'Reset demo data?',
          message: 'This erases every payment you simulated and restores the original demo data. This cannot be undone.',
          confirmLabel: 'Reset demo data',
          danger: true,
          onConfirm: function () {
            T.ui.payments = { q: '', status: '', source: '', channel: '', sort: '', page: 1 };
            T.ui.students = { q: '', faculty: '', department: '', status: '', page: 1 };
            T.ui.clearance = { q: '', filter: 'all' };
            T.ui.quick = { q: '' };
            T.resetState();
            T.toast('success', 'Demo data has been reset to the original set.');
          }
        });
        break;

      case 'confirm-assign': {
        var select = byId('assign-student');
        var err = byId('assign-error');
        var txKey = el.getAttribute('data-id');
        if (!select || !select.value) {
          if (err) err.textContent = 'Please choose a student before assigning.';
          if (select) select.focus();
          break;
        }
        var student = T.getStudent(select.value);
        var tx = T.getTransaction(txKey);
        if (!student || !tx) { T.toast('error', 'Could not find that student or payment.'); break; }
        T.confirmDialog({
          title: 'Assign this payment?',
          message: 'You are about to credit <strong>' + T.util.formatNaira(tx.amountKobo) + '</strong> to <strong>' + esc(student.fullName) + '</strong>. This will update their balance and clearance status.',
          confirmLabel: 'Yes, assign payment',
          onConfirm: function () {
            var result = T.manuallyReconcilePayment(txKey, student.id);
            T.closeAllModals();
            if (result.ok) T.toast('success', 'Manual reconciliation complete. ' + result.message);
            else T.toast('error', result.message);
          }
        });
        break;
      }

      default:
        break;
    }
  });

  /* ---------- Search boxes and filters ---------- */
  function onFilterChange(e) {
    var el = e.target.closest('[data-filter-view]');
    if (!el) return;
    var view = el.getAttribute('data-filter-view');
    var key = el.getAttribute('data-filter-key');
    if (!T.ui[view]) return;
    T.ui[view][key] = el.value;
    if ('page' in T.ui[view]) T.ui[view].page = 1;
    T.refreshResults(view);
  }
  document.addEventListener('input', onFilterChange);
  document.addEventListener('change', function (e) {
    if (e.target.matches && e.target.matches('select[data-filter-view]')) onFilterChange(e);

    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'change-demo-student') {
      T.getState().settings.demoStudentId = el.value;
      T.saveState();
      T.refreshPage();
    } else if (action === 'pick-student') {
      if (el.value && byId('sim-code')) byId('sim-code').value = el.value;
    }
  });

  /* ---------- Forms ---------- */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form="simulate"]');
    if (!form) return;
    e.preventDefault();
    try {
      T.handleSimulateSubmit(form);
    } catch (err) {
      if (window.console) console.error(err);
      T.toast('error', 'Something went wrong while processing the payment. Please try again.');
    }
  });

  /* ---------- Start ---------- */
  function start() {
    T.loadState();
    T.subscribe(function () { T.refreshPage(); });
    window.addEventListener('hashchange', function () {
      T.closeAllModals();
      T.renderApp();
    });
    T.renderApp();
    if (T.loadWarning) T.toast('warning', T.loadWarning);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
