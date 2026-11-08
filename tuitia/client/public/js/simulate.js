/* ============================================================
   simulate.js — the "simulate a payment" form (used by BOTH experiences)
   ------------------------------------------------------------
   This file only collects what the person typed and shows the result.
   The matching itself is done by T.reconcilePayment() in reconciliation.js.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});
  var esc = T.util.escapeHtml;
  var fmt = T.util.formatNaira;

  function options(list, selected) {
    return list.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  function field(id, label, control, error, hint) {
    return '<div class="field' + (error ? ' field--error' : '') + '">' +
      '<label class="label" for="' + id + '">' + esc(label) + '</label>' + control +
      (hint ? '<p class="field__hint" id="' + id + '-hint">' + esc(hint) + '</p>' : '') +
      '<p class="field__error" id="' + id + '-error" role="alert">' + (error ? esc(error) : '') + '</p></div>';
  }

  /** mode: 'student' (limited form) or 'admin' (full bursary use). */
  function formHtml(mode, student, values, errors) {
    var v = values || {};
    var e = errors || {};
    var isStudent = mode === 'student';
    var code = v.referenceCode != null ? v.referenceCode : (student ? student.referenceCode : '');
    var channel = v.channel || T.CONFIG.CHANNELS[0];
    var txnId = v.transactionId != null ? v.transactionId : T.generateTransactionId(channel);

    var studentOptions = '<option value="">Choose a student to fill their code (optional)</option>' +
      T.getAllStudents().map(function (s) {
        return '<option value="' + esc(s.referenceCode) + '">' + esc(s.fullName) + ' — ' + esc(s.matricNumber) + '</option>';
      }).join('');

    var codeField = isStudent
      ? field('sim-code', 'Your Tuitia Reference Code',
          '<input class="input mono" id="sim-code" name="referenceCode" value="' + esc(code) + '" readonly aria-describedby="sim-code-hint sim-code-error" />' +
          '<label class="check"><input type="checkbox" id="sim-code-unlock" data-action="unlock-code" /> Edit the code (only to demonstrate an unmatched payment)</label>',
          e.referenceCode, 'This code goes with every contribution so Tuitia can identify you.')
      : field('sim-code', 'Tuitia reference code',
          '<input class="input mono" id="sim-code" name="referenceCode" value="' + esc(code) + '" placeholder="TU-XXX-0000-AAA" autocomplete="off" aria-describedby="sim-code-hint sim-code-error" />',
          e.referenceCode, 'Try an unknown code such as TU-XYZ-0000-AAA to see the unmatched queue.');

    return '<form id="simulate-form" class="form" data-form="simulate" data-mode="' + (isStudent ? 'student' : 'admin') + '" data-student="' + (student ? esc(student.id) : '') + '" novalidate>' +
      '<div class="note note--info">' + T.icon('info', 18) + '<p><strong>Simulation only.</strong> This creates a pretend payment confirmation. No real money moves and no payment provider is contacted.</p></div>' +
      (isStudent ? '' : '<div class="field"><label class="label" for="sim-student">Prefill from a student</label><select class="select" id="sim-student" data-action="pick-student">' + studentOptions + '</select></div>') +
      '<div class="form__grid">' +
      field('sim-source', isStudent ? 'Who is contributing?' : 'Payment source', '<select class="select" id="sim-source" name="source">' + options(T.CONFIG.SOURCES, v.source || 'Parent') + '</select>', e.source) +
      field('sim-amount', 'Amount (₦)', '<div class="input-affix"><span aria-hidden="true">₦</span><input class="input num" id="sim-amount" name="amount" inputmode="decimal" autocomplete="off" placeholder="50,000" value="' + esc(v.amount || '') + '" aria-describedby="sim-amount-error" /></div>', e.amount) +
      field('sim-channel', 'Payment channel (demo label)', '<select class="select" id="sim-channel" name="channel">' + options(T.CONFIG.CHANNELS, channel) + '</select>', e.channel) +
      field('sim-txn', 'Transaction ID', '<div class="input-row"><input class="input mono" id="sim-txn" name="transactionId" value="' + esc(txnId) + '" autocomplete="off" aria-describedby="sim-txn-hint sim-txn-error" /><button type="button" class="btn btn--secondary btn--sm" data-action="new-txn-id">New ID</button></div>', e.transactionId,
        isStudent ? 'Generated for you. Reusing an existing ID demonstrates duplicate protection.' : 'Reuse an existing ID to demonstrate duplicate protection.') +
      '</div>' + codeField +
      (isStudent ? '' :
        '<div class="form__grid">' +
        field('sim-date', 'Date', '<input class="input" type="date" id="sim-date" name="date" value="' + esc(v.date || T.util.todayKey()) + '" max="' + T.util.todayKey() + '" />', e.date) +
        field('sim-time', 'Time', '<input class="input" type="time" id="sim-time" name="time" value="' + esc(v.time || T.util.nowTime()) + '" />', e.time) +
        '</div>') +
      '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-modal-close-btn>Cancel</button>' +
      '<button type="submit" class="btn btn--primary">' + (isStudent ? 'Submit simulated contribution' : 'Submit simulated payment') + '</button></div></form>';
  }

  function resultHtml(mode, result, studentId) {
    var tone = result.outcome === 'reconciled' ? 'green' : result.outcome === 'unmatched' ? 'amber' : 'neutral';
    var title = result.outcome === 'reconciled' ? 'Successfully reconciled' : result.outcome === 'unmatched' ? 'Held for review (unmatched)' : 'Duplicate blocked';
    var detail = '';
    var message = result.message;
    var isStudent = mode === 'student';

    if (result.outcome === 'reconciled') {
      var f = result.financials;
      if (isStudent) message = 'Your contribution of ' + fmt(result.transaction.amountKobo) + ' from ' + result.transaction.source + ' was matched to your Tuitia reference code and added to your record.';
      detail = '<dl class="kv"><div><dt>Transaction ID</dt><dd class="mono">' + esc(result.transaction.transactionId) + '</dd></div>' +
        '<div><dt>Credited to</dt><dd>' + esc(result.student.fullName) + '</dd></div>' +
        '<div><dt>Total paid now</dt><dd class="num">' + fmt(f.paidKobo) + '</dd></div>' +
        '<div><dt>Outstanding balance</dt><dd class="num">' + fmt(f.outstandingKobo) + '</dd></div>' +
        '<div><dt>Clearance status</dt><dd>' + T.badgeForClearance(f) + '</dd></div></dl>';
    } else if (result.outcome === 'unmatched') {
      if (isStudent) message = 'This payment could not yet be matched, so it has been kept safely for the bursary to review. Nothing was lost.';
      detail = '<dl class="kv"><div><dt>Transaction ID</dt><dd class="mono">' + esc(result.transaction.transactionId) + '</dd></div>' +
        '<div><dt>Reference code received</dt><dd class="mono">' + esc(result.transaction.referenceCode) + '</dd></div>' +
        '<div><dt>Reason</dt><dd>' + esc(result.transaction.reconciliation.reason) + '</dd></div></dl>';
    } else if (result.outcome === 'duplicate') {
      detail = '<dl class="kv"><div><dt>Transaction ID</dt><dd class="mono">' + esc(result.duplicate.transactionId) + '</dd></div>' +
        '<div><dt>Counted towards totals?</dt><dd>No. The original payment is unchanged.</dd></div></dl>';
    }

    var primaryLink = isStudent
      ? '<a class="btn btn--secondary" href="#/bursary/payments" data-modal-close-btn>View in Bursary Workspace</a>'
      : '<a class="btn btn--secondary" href="#/bursary/' + (result.outcome === 'unmatched' ? 'reconciliation' : 'payments') + '" data-modal-close-btn>' + (result.outcome === 'unmatched' ? 'Open reconciliation' : 'View in payments') + '</a>';

    return '<div class="result result--' + tone + '" aria-live="polite"><div class="result__head"><span class="result__icon">' + T.icon(result.outcome === 'reconciled' ? 'check' : 'alert', 20) + '</span>' +
      '<h3 class="result__title">' + title + '</h3></div><p>' + esc(message) + '</p>' + detail + '</div>' +
      '<div class="modal__actions">' + primaryLink +
      '<button type="button" class="btn btn--secondary" data-action="simulate-again" data-mode="' + mode + '" data-student="' + (studentId || '') + '">Simulate another</button>' +
      '<button type="button" class="btn btn--primary" data-modal-close-btn data-autofocus>Done</button></div>';
  }

  /** Opens the modal. mode: 'student' | 'admin'. */
  T.openSimulateModal = function (mode, studentId) {
    var student = studentId ? T.getStudent(studentId) : null;
    var isStudent = mode === 'student' && student;
    var handle = T.openModal({
      title: isStudent ? 'Simulate a contribution' : 'Simulate incoming payment',
      size: 'md',
      body: formHtml(isStudent ? 'student' : 'admin', student)
    });
    return handle;
  };
  T.handleSimulateSubmit = function (form) {
    var mode = form.getAttribute('data-mode');
    var studentId = form.getAttribute('data-student');
    var data = new FormData(form);
    var amount = T.parseNairaToKobo(data.get('amount'));

    var values = {
      transactionId: data.get('transactionId'),
      referenceCode: data.get('referenceCode'),
      source: data.get('source'),
      channel: data.get('channel'),
      amount: data.get('amount'),
      date: data.get('date') || T.util.todayKey(),
      time: data.get('time') || T.util.nowTime()
    };

    var result = T.reconcilePayment({
      transactionId: values.transactionId,
      referenceCode: values.referenceCode,
      amountKobo: amount.ok ? amount.kobo : NaN,
      source: values.source,
      channel: values.channel,
      date: values.date,
      time: values.time
    });

    var modalBody = form.closest('.modal__body');

    if (result.outcome === 'invalid') {
      if (!amount.ok) result.errors.amount = amount.error;
      if (modalBody) {
        modalBody.innerHTML = formHtml(mode, studentId ? T.getStudent(studentId) : null, values, result.errors);
        var firstBad = modalBody.querySelector('.field--error .input, .field--error .select');
        if (firstBad) firstBad.focus();
      }
      T.toast('error', 'Please fix the highlighted fields.');
      return;
    }

    if (modalBody) modalBody.innerHTML = resultHtml(mode, result, studentId);
    var done = modalBody && modalBody.querySelector('[data-autofocus]');
    if (done) done.focus();

    if (result.outcome === 'reconciled') T.toast('success', 'Payment reconciled automatically.');
    else if (result.outcome === 'unmatched') T.toast('warning', 'Payment saved as unmatched for review.');
    else if (result.outcome === 'duplicate') T.toast('warning', 'Duplicate transaction ID blocked. Nothing was added.');
  };
})();
