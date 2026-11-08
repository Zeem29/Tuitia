/* ============================================================
   student-view.js — the limited Student Demo screen
   ------------------------------------------------------------
   Reads the SAME state and uses the SAME reconciliation engine as the
   bursary workspace. It keeps no totals of its own.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});
  var esc = T.util.escapeHtml;
  var fmt = T.util.formatNaira;

  function bannerDismissed() {
    try { return window.sessionStorage.getItem('tuitia.bannerDismissed') === '1'; } catch (err) { return false; }
  }

  T.renderStudentView = function () {
    var state = T.getState();
    var student = T.getStudent(state.settings.demoStudentId) || state.students[0];
    var fin = T.getStudentFinancials(student);
    var history = T.getStudentPaymentHistory(student.id);

    var selector = '<div class="field field--inline"><label class="label" for="demo-student">Demo student</label>' +
      '<select class="select" id="demo-student" data-action="change-demo-student">' +
      state.students.map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (s.id === student.id ? ' selected' : '') + '>' + esc(s.fullName) + ' — ' + esc(s.matricNumber) + '</option>';
      }).join('') + '</select></div>';

    var rows = history.length
      ? T.table([
          { label: 'Date', render: T.cells.date },
          { label: 'Amount', cls: 'num-col', render: T.cells.amount },
          { label: 'Source', render: function (t) { return esc(t.source); } },
          { label: 'Channel', render: function (t) { return esc(t.channel); } },
          { label: 'Transaction ID', render: function (t) { return '<span class="mono small">' + esc(t.transactionId) + '</span>'; } },
          { label: 'Status', render: function (t) { return T.badgeForTransaction(t.status); } }
        ], history, { caption: 'Payment history for ' + student.fullName })
      : T.emptyState('No payments recorded yet', 'Contributions will appear here as soon as they are reconciled.');

    var overNote = fin.overpaid
      ? '<div class="note note--warn">' + T.icon('alert', 18) + '<p>You have paid ' + fmt(fin.overpaymentKobo) + ' more than the fee. The bursary will review this overpayment.</p></div>'
      : '';

    return {
      html:
        (bannerDismissed() ? '' : '<div class="demo-banner" role="note">' + T.icon('info', 18) + '<p><strong>Student Demo.</strong> A limited view of one fictional student, not the full student portal.</p><button type="button" class="demo-banner__close" data-action="dismiss-banner" aria-label="Dismiss notice">' + T.icon('x', 16) + '</button></div>') +
        '<section class="student-hero card">' +
        '<div class="student-hero__id"><span class="avatar avatar--lg" aria-hidden="true">' + esc(T.util.initials(student.fullName)) + '</span>' +
        '<div><h1 class="page-title">' + esc(student.fullName) + '</h1>' +
        '<p class="muted">Matric no. <span class="mono">' + esc(student.matricNumber) + '</span> · ' + esc(student.department) + ', ' + esc(String(student.faculty).replace(/^Faculty of /,'')) + ' · ' + student.level + ' level</p></div></div>' +
        selector + '</section>' +
        '<div class="grid grid--4 student-stats">' +
        T.statCard('Fee due', fmt(fin.requiredKobo), 'Required for this session') +
        T.statCard('Total paid', fmt(fin.paidKobo), 'Reconciled payments only', 'green') +
        T.statCard('Outstanding balance', fmt(fin.outstandingKobo), fin.outstandingKobo > 0 ? 'Still to be received' : 'Nothing left to pay', fin.outstandingKobo > 0 ? 'amber' : 'green') +
        '<div class="stat"><p class="stat__label">Clearance status</p><p class="stat__badge">' + T.badgeForClearance(fin) + '</p>' +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + fin.percent + '" aria-label="Fee progress"><span style="width:' + fin.percent + '%"></span></div>' +
        '<p class="stat__hint">' + fin.percent + '% of the fee paid</p></div></div>' +
        overNote +
        '<div class="grid grid--2 student-main">' +
        '<section class="card code-card"><p class="eyebrow">Your Tuitia reference code</p>' +
        '<p class="code-card__code mono" id="student-code">' + esc(student.referenceCode) + '</p>' +
        '<div class="code-card__actions"><button type="button" class="btn btn--secondary" data-action="copy-code" data-code="' + esc(student.referenceCode) + '">' + T.icon('copy', 16) + ' Copy code</button></div>' +
        '<p class="small code-card__note">Include this code with every fee payment, whether it comes from a parent, guardian, scholarship, loan scheme or you. Tuitia reads it to identify you and add the payment to your record.</p></section>' +
        '<section class="card contribute-card"><p class="eyebrow">Simulate a contribution</p>' +
        '<h2 class="card-title">See the reconciliation engine work</h2>' +
        '<p class="small contribute-card__lead">Pretend a parent, guardian, scholarship or loan scheme has paid. The same engine the bursary uses will match it to your code and update your balance. This is a simulation: Tuitia is not a payment gateway.</p>' +
        '<p class="small contribute-card__next">What happens next: you choose who paid and how much, and the payment appears in your history and in the Bursary Workspace.</p>' +
        '<div class="contribute-card__actions"><button type="button" class="btn btn--primary" data-action="open-simulate" data-mode="student" data-student="' + esc(student.id) + '">' + T.icon('plus', 16) + ' Simulate a contribution</button>' +
        '<a class="btn btn--ghost" href="#/bursary/overview">Open Bursary Workspace</a></div></section></div>' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Payment history</h2><p class="muted small">' + history.length + ' reconciled payment' + (history.length === 1 ? '' : 's') + '</p></div>' + rows + '</section>'
    };
  };
})();
