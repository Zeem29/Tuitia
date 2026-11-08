/* ============================================================
   dashboard.js — the five Bursary Workspace sections
   ------------------------------------------------------------
   Overview, Payments, Reconciliation, Students, Clearance.
   Every number is read from payments.js / students.js. Nothing is typed
   in here. Each view returns { title, description, actions, html }.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});
  var esc = T.util.escapeHtml;
  var fmt = T.util.formatNaira;

  /* Filter values live here so they survive a redraw. */
  T.ui = {
    payments: { q: '', status: '', source: '', channel: '', sort: '', page: 1 },
    students: { q: '', faculty: '', department: '', status: '', page: 1 },
    clearance: { q: '', filter: 'all' },
    quick: { q: '' }
  };
  /* Functions that redraw only the results area (keeps the search box focused). */
  T.resultRenderers = {};

  function pageTitle(text) {
    return text;
  }

  function simulateButton() {
    return '<button type="button" class="btn btn--primary" data-action="open-simulate" data-mode="admin">' + T.icon('plus', 16) + ' Simulate incoming payment</button>';
  }

  function paginate(list, page) {
    var size = T.CONFIG.PAGE_SIZE;
    var pages = Math.max(1, Math.ceil(list.length / size));
    var p = Math.min(Math.max(1, page), pages);
    return { items: list.slice((p - 1) * size, p * size), page: p, pages: pages, total: list.length, from: list.length ? (p - 1) * size + 1 : 0, to: Math.min(p * size, list.length) };
  }

  function pager(view, pg) {
    if (pg.pages <= 1) return '<p class="muted small results-count">' + pg.total + ' result' + (pg.total === 1 ? '' : 's') + '</p>';
    return '<div class="pager"><p class="muted small">Showing ' + pg.from + '–' + pg.to + ' of ' + pg.total + '</p>' +
      '<div class="pager__btns"><button type="button" class="btn btn--secondary btn--sm" data-action="page" data-view="' + view + '" data-dir="-1"' + (pg.page <= 1 ? ' disabled' : '') + '>' + T.icon('chevronLeft', 14) + ' Previous</button>' +
      '<span class="small">Page ' + pg.page + ' of ' + pg.pages + '</span>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="page" data-view="' + view + '" data-dir="1"' + (pg.page >= pg.pages ? ' disabled' : '') + '>Next ' + T.icon('chevronRight', 14) + '</button></div></div>';
  }
  function selectFilter(view, key, label, values, current, allLabel) {
    return '<div class="field"><label class="label" for="f-' + view + '-' + key + '">' + esc(label) + '</label>' +
      '<select class="select" id="f-' + view + '-' + key + '" data-filter-view="' + view + '" data-filter-key="' + key + '">' +
      '<option value="">' + esc(allLabel) + '</option>' +
      values.map(function (v) {
        var value = typeof v === 'string' ? v : v.value;
        var text = typeof v === 'string' ? v : v.label;
        return '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(text) + '</option>';
      }).join('') + '</select></div>';
  }

  function searchField(view, placeholder, value, label) {
    return '<div class="field field--grow"><label class="label" for="f-' + view + '-q">' + esc(label || 'Search') + '</label>' +
      '<div class="search">' + T.icon('search', 16) +
      '<input class="input" type="search" id="f-' + view + '-q" data-filter-view="' + view + '" data-filter-key="q" placeholder="' + esc(placeholder) + '" value="' + esc(value) + '" autocomplete="off" /></div></div>';
  }

  /* ==========================================================
     OVERVIEW
     ========================================================== */
  function activityRows(list) {
    return T.table([
      { label: 'Transaction', render: T.cells.txId },
      { label: 'Student', render: T.cells.student },
      { label: 'Amount', cls: 'num-col', render: T.cells.amount },
      { label: 'Source', render: function (t) { return esc(t.source) + ' <span class="muted small via">via ' + esc(t.channel) + '</span>'; } },
      { label: 'When', render: T.cells.date },
      { label: 'Status', render: function (t) { return T.badgeForTransaction(t.status); } }
    ], list, { caption: 'Recent payment activity' });
  }

  function quickResults() {
    var q = T.ui.quick.q.trim();
    if (!q) return '<p class="muted small">Type a name, matric number or reference code to find a student record.</p>';
    var found = T.searchStudents(q).slice(0, 5);
    if (!found.length) return T.emptyState('No student found', 'Check the spelling or try a matric number.');
    return '<ul class="list">' + found.map(function (s) {
      var fin = T.getStudentFinancials(s);
      return '<li><button type="button" class="list__item" data-action="view-student" data-id="' + esc(s.id) + '"><span class="list__main"><span class="strong">' + esc(s.fullName) + '</span><span class="muted small mono">' + esc(s.matricNumber) + '</span></span>' + T.badgeForClearance(fin) + '</button></li>';
    }).join('') + '</ul>';
  }
  T.resultRenderers.quick = quickResults;

  function overview() {
    var totals = T.getTotals();
    var counts = T.getClearanceCounts();
    var daily = T.getDailySummary();
    var unmatched = T.getUnmatchedTransactions().slice(0, 3);
    var recent = T.getRecentTransactions(8);

    var unmatchedHtml = unmatched.length
      ? '<ul class="list">' + unmatched.map(function (t) {
          return '<li class="list__row"><span class="list__main"><span class="strong num">' + fmt(t.amountKobo) + '</span><span class="muted small mono">' + esc(t.referenceCode) + '</span></span>' +
            '<button type="button" class="btn btn--secondary btn--sm" data-action="review-unmatched" data-id="' + esc(t.id) + '">Review</button></li>';
        }).join('') + '</ul>'
      : T.emptyState('Queue is empty', 'No unmatched payments are waiting for review.');

    return {
      title: 'Overview',
      description: 'Your payment position at a glance, calculated live from the transaction ledger.',
      actions: simulateButton(),
      html:
        '<div class="grid grid--3">' +
        T.statCard('Total payments received', fmt(totals.receivedKobo), totals.transactionCount + ' transactions recorded') +
        T.statCard('Successfully reconciled', fmt(totals.reconciledKobo), totals.reconciledCount + ' matched to students', 'green') +
        T.statCard('Unmatched payments', fmt(totals.unmatchedKobo), totals.unmatchedCount ? '<a href="#/bursary/reconciliation">' + totals.unmatchedCount + ' awaiting review</a>' : 'Nothing awaiting review', totals.unmatchedCount ? 'amber' : '') +
        '</div>' +
        '<div class="grid grid--4 grid--tight">' +
        T.statCard('Total students', String(counts.total), '') +
        T.statCard('Cleared', String(counts.cleared), '<a href="#/bursary/clearance?filter=cleared">View list</a>', 'green') +
        T.statCard('Partially paid', String(counts.partial), '<a href="#/bursary/clearance?filter=partial">View list</a>', 'amber') +
        T.statCard('Not cleared', String(counts['not-cleared']), '<a href="#/bursary/clearance?filter=not-cleared">View list</a>') +
        '</div>' +
        '<div class="grid grid--split">' +
        '<div class="stack">' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Recent payment activity</h2><a class="link small link--arrow" href="#/bursary/payments">Open payment feed ' + T.icon('arrow', 14) + '</a></div>' +
        (recent.length ? activityRows(recent) : T.emptyState('No payments yet', 'Simulated payments will appear here.')) + '</section>' +
        '</div>' +
        '<div class="stack">' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Today\u2019s summary</h2><p class="muted small">' + esc(T.util.formatDate(T.util.todayKey())) + '</p></div>' +
        '<dl class="kv kv--stack"><div><dt>Amount received today</dt><dd class="num strong">' + fmt(daily.receivedKobo) + '</dd></div>' +
        '<div><dt>Transactions today</dt><dd class="num">' + daily.transactionCount + '</dd></div>' +
        '<div><dt>Reconciled today</dt><dd class="num">' + fmt(daily.reconciledKobo) + ' <span class="muted">(' + daily.reconciledCount + ')</span></dd></div>' +
        '<div><dt>Unmatched today</dt><dd class="num">' + daily.unmatchedCount + '</dd></div></dl></section>' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Find a student</h2></div>' +
        '<div class="search">' + T.icon('search', 16) + '<input class="input" type="search" id="f-quick-q" data-filter-view="quick" data-filter-key="q" placeholder="Name, matric no. or reference code" value="' + esc(T.ui.quick.q) + '" autocomplete="off" aria-label="Find a student" /></div>' +
        '<div id="results" class="quick-results" aria-live="polite">' + quickResults() + '</div></section>' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Unmatched queue</h2><a class="link small" href="#/bursary/reconciliation">View all</a></div>' + unmatchedHtml + '</section>' +
        '</div></div>'
    };
  }

  /* ==========================================================
     NOTIFICATIONS (opened from the bell, not part of the side navigation)
     ========================================================== */
  function notifications() {
    var alerts = T.getOperationalAlerts();
    var html = alerts.length
      ? '<ul class="alerts">' + alerts.map(function (a) {
          return '<li class="alert alert--' + a.level + '"><span class="alert__icon">' + T.icon(a.level === 'warning' ? 'alert' : 'info', 18) + '</span><div><a class="alert__title link" href="' + a.href + '">' + esc(a.title) + '</a><p class="small muted">' + esc(a.detail) + '</p></div></li>';
        }).join('') + '</ul>'
      : T.emptyState('No alerts', 'Everything is reconciled and no action is needed.');
    return {
      title: 'Notifications',
      description: 'Everything that needs your attention, updated live from the transaction ledger.',
      actions: '',
      html: '<section class="card"><div class="card__head"><h2 class="card-title">Operational alerts</h2></div>' + html + '</section>'
    };
  }

  /* ==========================================================
     PAYMENTS
     ========================================================== */
  function paymentsResults() {
    var f = T.ui.payments;
    var list = T.filterTransactions(f);
    var pg = paginate(list, f.page);
    f.page = pg.page;
    if (!T.getTransactions().length) return T.emptyState('No payments yet', 'Simulated payments will appear here.');
    if (!list.length) return T.emptyState('No payments match', 'Try a different search or clear the filters.', '<button type="button" class="btn btn--secondary btn--sm" data-action="clear-filters" data-view="payments">Clear filters</button>');
    return T.table([
      { label: 'Transaction ID', render: T.cells.txId },
      { label: 'Student', render: T.cells.student },
      { label: 'Reference code', render: T.cells.code },
      { label: 'Amount', cls: 'num-col', render: T.cells.amount },
      { label: 'Source', render: function (t) { return esc(t.source); } },
      { label: 'Channel', render: function (t) { return esc(t.channel); } },
      { label: 'Date', render: T.cells.date },
      { label: 'Status', render: function (t) { return T.badgeForTransaction(t.status); } }
    ], pg.items, { caption: 'Payment feed', rowAttrs: function (t) { return 'class="is-clickable"'; } }) + pager('payments', pg);
  }
  T.resultRenderers.payments = paymentsResults;

  function payments() {
    var f = T.ui.payments;
    return {
      title: 'Payments',
      description: 'Every incoming payment confirmation, in one live feed. Select a row to inspect it.',
      actions: simulateButton(),
      html:
        '<section class="card"><div class="filters">' +
        searchField('payments', 'Transaction ID, student or reference code', f.q, 'Search payments') +
        selectFilter('payments', 'status', 'Status', [{ value: 'reconciled', label: 'Reconciled' }, { value: 'unmatched', label: 'Unmatched' }], f.status, 'All statuses') +
        selectFilter('payments', 'source', 'Source', T.CONFIG.SOURCES, f.source, 'All sources') +
        selectFilter('payments', 'channel', 'Channel', T.CONFIG.CHANNELS, f.channel, 'All channels') +
        selectFilter('payments', 'sort', 'Sort by', [{ value: 'oldest', label: 'Oldest first' }, { value: 'amount-high', label: 'Amount: high to low' }, { value: 'amount-low', label: 'Amount: low to high' }], f.sort, 'Newest first') +
        '</div><div id="results" aria-live="polite">' + paymentsResults() + '</div></section>'
    };
  }
  /* ==========================================================
     RECONCILIATION
     ========================================================== */
  function reconciliation() {
    var totals = T.getTotals();
    var unmatched = T.getUnmatchedTransactions();
    var duplicates = T.getDuplicateAttempts();
    var overs = T.getOverpaymentExceptions();
    var matched = T.getReconciledTransactions().slice(0, 8);
    var exceptions = unmatched.length + overs.length;

    var unmatchedHtml = unmatched.length
      ? T.table([
          { label: 'Transaction ID', render: T.cells.txId },
          { label: 'Reference code', render: T.cells.code },
          { label: 'Amount', cls: 'num-col', render: T.cells.amount },
          { label: 'Source', render: function (t) { return esc(t.source); } },
          { label: 'Channel', render: function (t) { return esc(t.channel); } },
          { label: 'Date', render: T.cells.date },
          { label: 'Reason', render: function (t) { return esc((t.reconciliation && t.reconciliation.reason) || 'Not matched'); } },
          { label: 'Action', render: function (t) { return '<button type="button" class="btn btn--primary btn--sm" data-action="review-unmatched" data-id="' + esc(t.id) + '">Review</button>'; } }
        ], unmatched, { caption: 'Unmatched payment queue' })
      : T.emptyState('No unmatched transactions', 'Every payment has been matched to a student.');

    var dupHtml = duplicates.length
      ? T.table([
          { label: 'Transaction ID', render: function (d) { return '<span class="mono">' + esc(d.transactionId) + '</span>'; } },
          { label: 'Amount (not counted)', cls: 'num-col', render: function (d) { return '<span class="num">' + fmt(d.amountKobo) + '</span>'; } },
          { label: 'Source', render: function (d) { return '<span class="cell-stack"><span>' + esc(d.source) + '</span><span class="muted small">via ' + esc(d.channel) + '</span></span>'; } },
          { label: 'Attempted', render: function (d) { var dt = new Date(d.attemptedAt); return esc(T.util.formatDate(T.util.dateKey(dt))) + ' <span class="muted small">' + esc(T.util.pad2(dt.getHours()) + ':' + T.util.pad2(dt.getMinutes())) + '</span>'; } }
        ], duplicates, { caption: 'Duplicate attempts' })
      : T.emptyState('No duplicate attempts', 'Repeated transaction IDs are blocked and logged here.');

    var overHtml = overs.length
      ? T.table([
          { label: 'Student', render: function (r) { return '<button type="button" class="link-btn" data-action="view-student" data-id="' + esc(r.student.id) + '">' + esc(r.student.fullName) + '</button>'; } },
          { label: 'Required fees', cls: 'num-col', render: function (r) { return '<span class="num">' + fmt(r.financials.requiredKobo) + '</span>'; } },
          { label: 'Total paid', cls: 'num-col', render: function (r) { return '<span class="num">' + fmt(r.financials.paidKobo) + '</span>'; } },
          { label: 'Excess', cls: 'num-col', render: function (r) { return '<span class="num strong">' + fmt(r.financials.overpaymentKobo) + '</span>'; } },
          { label: 'Transactions', render: function (r) { return r.transactions.map(function (t) { return '<button type="button" class="link-btn mono small" data-action="view-tx" data-id="' + esc(t.id) + '">' + esc(t.transactionId) + '</button>'; }).join(' '); } }
        ], overs, { caption: 'Overpayment exceptions' }) + '<p class="small muted note-line">Flagged for review only. Tuitia does not issue refunds automatically.</p>'
      : T.emptyState('No overpayments', 'No student has paid more than their required fees.');

    var matchedHtml = T.table([
      { label: 'Transaction ID', render: T.cells.txId },
      { label: 'Student', render: T.cells.student },
      { label: 'Amount', cls: 'num-col', render: T.cells.amount },
      { label: 'Matched by', render: function (t) { return t.reconciliation && t.reconciliation.method === 'manual' ? 'Assigned manually (bursary)' : 'Reference code (automatic)'; } },
      { label: 'Date', render: T.cells.date }
    ], matched, { caption: 'Recently matched payments' });

    return {
      title: 'Reconciliation',
      description: 'Where payments are matched to students, and where exceptions are reviewed.',
      actions: simulateButton(),
      html:
        '<div class="grid grid--4">' +
        T.statCard('Total transactions', String(totals.transactionCount), 'Duplicates excluded') +
        T.statCard('Matched', String(totals.reconciledCount), fmt(totals.reconciledKobo), 'green') +
        T.statCard('Unmatched', String(totals.unmatchedCount), fmt(totals.unmatchedKobo), totals.unmatchedCount ? 'amber' : '') +
        T.statCard('Duplicate attempts', String(totals.duplicateCount), 'Blocked, not counted') +
        '</div>' +
        (exceptions ? '<p class="exceptions-line">' + T.icon('alert', 16) + ' <span>' + [unmatched.length ? '<strong>' + unmatched.length + '</strong> unmatched payment' + (unmatched.length === 1 ? '' : 's') + ' to assign' : '', overs.length ? '<strong>' + overs.length + '</strong> overpayment' + (overs.length === 1 ? '' : 's') + ' flagged for review' : ''].filter(Boolean).join(' and ') + '.</span></p>' : '') +
        '<section class="card card--emphasis"><div class="card__head"><h2 class="card-title">Unmatched payment queue</h2>' + (unmatched.length ? '<p class="muted small">' + unmatched.length + ' waiting</p>' : '') + '</div>' +
        '<p class="small muted lead">These payments carried a reference code Tuitia does not recognise. They are not credited to anyone until you assign them.</p>' + unmatchedHtml + '</section>' +
        '<div class="grid grid--2">' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Overpayment exceptions</h2></div>' + overHtml + '</section>' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Duplicate attempts</h2></div>' + dupHtml + '</section></div>' +
        '<section class="card"><div class="card__head"><h2 class="card-title">Recently matched</h2></div>' + matchedHtml + '</section>'
    };
  }

  /* ==========================================================
     STUDENTS
     ========================================================== */
  function studentsResults() {
    var f = T.ui.students;
    var list = T.searchStudents(f.q, { faculty: f.faculty, department: f.department, status: f.status });
    var pg = paginate(list, f.page);
    f.page = pg.page;
    if (!list.length) {
      return T.emptyState(f.q ? 'No search results' : 'No matching students', 'Try a different name, matric number or reference code, or clear the filters.', '<button type="button" class="btn btn--secondary btn--sm" data-action="clear-filters" data-view="students">Clear filters</button>');
    }
    return T.table([
      { label: 'Student', render: function (s) { return '<button type="button" class="link-btn strong" data-action="view-student" data-id="' + esc(s.id) + '">' + esc(s.fullName) + '</button>'; } },
      { label: 'Matric no.', render: function (s) { return '<span class="mono small">' + esc(s.matricNumber) + '</span>'; } },
      { label: 'Faculty / department', render: function (s) { return '<span class="cell-stack"><span>' + esc(s.department) + '</span><span class="muted small">' + esc(s.faculty) + '</span></span>'; } },
      { label: 'Level', render: function (s) { return esc(s.level); } },
      { label: 'Reference code', render: function (s) { return T.codeChip(s.referenceCode); } },
      { label: 'Required', cls: 'num-col', render: function (s) { return '<span class="num">' + fmt(s.requiredFees) + '</span>'; } },
      { label: 'Paid', cls: 'num-col', render: function (s) { return '<span class="num">' + fmt(T.calculateTotalPaid(s.id)) + '</span>'; } },
      { label: 'Outstanding', cls: 'num-col', render: function (s) { return '<span class="num">' + fmt(T.calculateOutstanding(s)) + '</span>'; } },
      { label: 'Status', render: function (s) { return T.badgeForClearance(T.getStudentFinancials(s)); } }
    ], pg.items, { caption: 'Student directory' }) + pager('students', pg);
  }
  T.resultRenderers.students = studentsResults;

  function students() {
    var f = T.ui.students;
    return {
      title: 'Students',
      description: 'An internal directory of student financial records. Search by name, matric number or reference code.',
      actions: simulateButton(),
      html:
        '<section class="card"><div class="filters">' +
        searchField('students', 'Name, matric number or reference code', f.q, 'Search students') +
        selectFilter('students', 'faculty', 'Faculty', T.getFaculties(), f.faculty, 'All faculties') +
        selectFilter('students', 'department', 'Department', T.getDepartments(), f.department, 'All departments') +
        selectFilter('students', 'status', 'Clearance', [{ value: 'cleared', label: 'Cleared' }, { value: 'partial', label: 'Partially paid' }, { value: 'not-cleared', label: 'Not cleared' }, { value: 'overpaid', label: 'Overpayment exception' }], f.status, 'Any status') +
        '</div><div id="results" aria-live="polite">' + studentsResults() + '</div></section>'
    };
  }

  /* ==========================================================
     CLEARANCE
     ========================================================== */
  var CLEARANCE_TABS = [
    { key: 'all', label: 'All' },
    { key: 'cleared', label: 'Cleared' },
    { key: 'partial', label: 'Partially paid' },
    { key: 'not-cleared', label: 'Not cleared' },
    { key: 'overpaid', label: 'Overpayment exception' }
  ];

  function clearanceCount(counts, key) {
    return key === 'all' ? counts.total : counts[key];
  }

  function clearanceTabs() {
    var counts = T.getClearanceCounts();
    return '<div class="tabs" role="group" aria-label="Filter by clearance status">' + CLEARANCE_TABS.map(function (tab) {
      var active = T.ui.clearance.filter === tab.key;
      return '<button type="button" class="tab' + (active ? ' is-active' : '') + '" data-action="clearance-tab" data-filter="' + tab.key + '" aria-pressed="' + active + '">' + esc(tab.label) + ' <span class="tab__count num">' + clearanceCount(counts, tab.key) + '</span></button>';
    }).join('') + '</div>';
  }

  function clearanceResults() {
    var f = T.ui.clearance;
    var list = T.searchStudents(f.q, { status: f.filter === 'all' ? '' : f.filter });
    var tabs = document.getElementById('clearance-tabs');
    if (tabs) tabs.innerHTML = clearanceTabs();
    if (!list.length) {
      return T.emptyState('No students in this group', f.q ? 'No student in this group matches your search.' : 'No students currently fall into this group.');
    }
    return T.table([
      { label: 'Student', render: function (s) { return '<button type="button" class="link-btn strong" data-action="view-student" data-id="' + esc(s.id) + '">' + esc(s.fullName) + '</button>'; } },
      { label: 'Matric no.', render: function (s) { return '<span class="mono small">' + esc(s.matricNumber) + '</span>'; } },
      { label: 'Department', render: function (s) { return esc(s.department); } },
      { label: 'Required fees', cls: 'num-col', render: function (s) { return '<span class="num">' + fmt(s.requiredFees) + '</span>'; } },
      { label: 'Total paid', cls: 'num-col', render: function (s) { return '<span class="num">' + fmt(T.calculateTotalPaid(s.id)) + '</span>'; } },
      { label: 'Outstanding', cls: 'num-col', render: function (s) { return '<span class="num">' + fmt(T.calculateOutstanding(s)) + '</span>'; } },
      { label: 'Status', render: function (s) { return T.badgeForClearance(T.getStudentFinancials(s)); } }
    ], list, { caption: 'Clearance list' });
  }
  T.resultRenderers.clearance = clearanceResults;

  function clearance() {
    var counts = T.getClearanceCounts();
    var pct = counts.total ? Math.round((counts.cleared / counts.total) * 100) : 0;
    return {
      title: 'Clearance',
      description: 'Who has completed their fee obligations, calculated from reconciled payments only.',
      actions: simulateButton(),
      html:
        '<section class="card clearance-summary"><div><p class="eyebrow">Fee clearance</p><p class="clearance-summary__big">' + counts.cleared + ' of ' + counts.total + ' students cleared</p>' +
        '<p class="muted small">Cleared means total valid payments meet or exceed the required fees. Unmatched and duplicate payments are never counted.</p></div>' +
        '<div class="progress progress--lg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Share of students cleared"><span style="width:' + pct + '%"></span></div></section>' +
        '<section class="card"><div class="filters filters--tabs"><div id="clearance-tabs">' + clearanceTabs() + '</div>' +
        searchField('clearance', 'Name, matric number or reference code', T.ui.clearance.q, 'Search students') + '</div>' +
        '<div id="results" aria-live="polite">' + clearanceResults() + '</div></section>'
    };
  }

  T.bursaryViews = { overview: overview, alerts: notifications, payments: payments, reconciliation: reconciliation, students: students, clearance: clearance };
  T.pageTitle = pageTitle;

  /* ==========================================================
     DETAIL DIALOGS (transaction, student, review unmatched)
     ========================================================== */
  T.openTransactionModal = function (id) {
    var t = T.getTransaction(id);
    if (!t) { T.toast('error', 'That transaction could not be found.'); return; }
    var s = t.studentId ? T.getStudent(t.studentId) : null;
    var r = t.reconciliation || {};
    var how = t.status === 'reconciled'
      ? (r.method === 'manual' ? 'Assigned manually by the bursary administrator' : 'Matched automatically on reference code')
      : (r.reason || 'Not matched');
    var body = '<dl class="kv"><div><dt>Transaction ID</dt><dd class="mono">' + esc(t.transactionId) + '</dd></div>' +
      '<div><dt>Status</dt><dd>' + T.badgeForTransaction(t.status) + '</dd></div>' +
      '<div><dt>Amount</dt><dd class="num strong">' + fmt(t.amountKobo) + '</dd></div>' +
      '<div><dt>Reference code received</dt><dd>' + T.codeChip(t.referenceCode) + '</dd></div>' +
      '<div><dt>Source</dt><dd>' + esc(t.source) + '</dd></div>' +
      '<div><dt>Channel</dt><dd>' + esc(t.channel) + ' <span class="muted small">(demo label)</span></dd></div>' +
      '<div><dt>Date and time</dt><dd>' + esc(T.util.formatDate(t.date)) + ', ' + esc(t.time) + '</dd></div>' +
      '<div><dt>Credited to</dt><dd>' + (s ? '<button type="button" class="link-btn" data-action="view-student" data-id="' + esc(s.id) + '">' + esc(s.fullName) + '</button>' : '<span class="muted">Not assigned</span>') + '</dd></div>' +
      '<div><dt>' + (t.status === 'reconciled' ? 'How it was matched' : 'Why it is unmatched') + '</dt><dd>' + esc(how) + '</dd></div>' +
      (r.previousReason ? '<div><dt>Originally unmatched because</dt><dd>' + esc(r.previousReason) + '</dd></div>' : '') +
      '</dl>' +
      '<div class="modal__actions">' +
      (t.status === 'unmatched' ? '<button type="button" class="btn btn--primary" data-action="review-unmatched" data-id="' + esc(t.id) + '">Review and assign</button>' : '') +
      '<button type="button" class="btn btn--secondary" data-modal-close-btn>Close</button></div>';
    T.openModal({ title: 'Transaction details', body: body });
  };

  T.openStudentModal = function (id) {
    var s = T.getStudent(id);
    if (!s) { T.toast('error', 'That student record could not be found.'); return; }
    var fin = T.getStudentFinancials(s);
    var history = T.getStudentPaymentHistory(s.id);
    var hist = history.length
      ? T.table([
          { label: 'Date', render: T.cells.date },
          { label: 'Amount', cls: 'num-col', render: T.cells.amount },
          { label: 'Source', render: function (t) { return esc(t.source); } },
          { label: 'Channel', render: function (t) { return esc(t.channel); } },
          { label: 'Transaction ID', render: T.cells.txId }
        ], history, { caption: 'Payment history for ' + s.fullName })
      : T.emptyState('No payment history', 'No reconciled payments yet for this student.');
    var body =
      '<p class="note note--info">' + T.icon('info', 18) + '<span>Internal bursary record. This is not a student self-service portal.</span></p>' +
      '<dl class="kv"><div><dt>Student</dt><dd class="strong">' + esc(s.fullName) + '</dd></div>' +
      '<div><dt>Matric number</dt><dd class="mono">' + esc(s.matricNumber) + '</dd></div>' +
      '<div><dt>Faculty</dt><dd>' + esc(s.faculty) + '</dd></div>' +
      '<div><dt>Department</dt><dd>' + esc(s.department) + '</dd></div>' +
      '<div><dt>Academic level</dt><dd>' + esc(s.level) + '</dd></div>' +
      '<div><dt>Tuitia reference code</dt><dd>' + T.codeChip(s.referenceCode) + '</dd></div>' +
      '<div><dt>Required fee</dt><dd class="num">' + fmt(fin.requiredKobo) + '</dd></div>' +
      '<div><dt>Total valid payments</dt><dd class="num">' + fmt(fin.paidKobo) + '</dd></div>' +
      '<div><dt>Outstanding balance</dt><dd class="num strong">' + fmt(fin.outstandingKobo) + '</dd></div>' +
      '<div><dt>Clearance status</dt><dd>' + T.badgeForClearance(fin) + '</dd></div>' +
      (fin.overpaid ? '<div><dt>Overpayment</dt><dd class="num">' + fmt(fin.overpaymentKobo) + '</dd></div>' : '') +
      '</dl><h3 class="modal__subtitle">Payment history</h3>' + hist +
      '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="open-simulate" data-mode="admin" data-student="' + esc(s.id) + '">Simulate payment for this student</button>' +
      '<button type="button" class="btn btn--primary" data-modal-close-btn>Close</button></div>';
    T.openModal({ title: s.fullName, size: 'lg', body: body });
  };

  T.openReviewModal = function (id) {
    var t = T.getTransaction(id);
    if (!t) { T.toast('error', 'That transaction could not be found.'); return; }
    if (t.status !== 'unmatched') {
      T.toast('warning', 'This transaction has already been reconciled.');
      return;
    }
    var options = T.getAllStudents().map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.fullName) + ' — ' + esc(s.matricNumber) + '</option>';
    }).join('');
    var body =
      '<div class="note note--warn">' + T.icon('alert', 18) + '<p>This payment is <strong>not credited to anyone</strong>. Choose the student it belongs to. Check the reference code carefully before assigning.</p></div>' +
      '<dl class="kv"><div><dt>Transaction ID</dt><dd class="mono">' + esc(t.transactionId) + '</dd></div>' +
      '<div><dt>Reference code received</dt><dd class="mono">' + esc(t.referenceCode) + '</dd></div>' +
      '<div><dt>Amount</dt><dd class="num strong">' + fmt(t.amountKobo) + '</dd></div>' +
      '<div><dt>Source and channel</dt><dd>' + esc(t.source) + ' via ' + esc(t.channel) + '</dd></div>' +
      '<div><dt>Date</dt><dd>' + esc(T.util.formatDate(t.date)) + ', ' + esc(t.time) + '</dd></div>' +
      '<div><dt>Why unmatched</dt><dd>' + esc((t.reconciliation && t.reconciliation.reason) || 'Not matched') + '</dd></div></dl>' +
      '<div class="field"><label class="label" for="assign-student">Assign to student</label>' +
      '<select class="select" id="assign-student" data-autofocus><option value="">Choose a student</option>' + options + '</select>' +
      '<p class="field__error" id="assign-error" role="alert"></p></div>' +
      '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-modal-close-btn>Cancel</button>' +
      '<button type="button" class="btn btn--primary" data-action="confirm-assign" data-id="' + esc(t.id) + '">Assign payment</button></div>';
    T.openModal({ title: 'Review unmatched payment', size: 'md', body: body });
  };
})();
