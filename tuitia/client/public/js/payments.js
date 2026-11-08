/* ============================================================
   payments.js — transaction validation, queries and dashboard totals
   ------------------------------------------------------------
   One place for every number the dashboards show, so Overview,
   Reconciliation and Clearance can never disagree.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});

  /* ---------- Identifiers and input parsing ---------- */
  T.normalizeTransactionId = function (id) {
    return String(id == null ? '' : id).trim().toUpperCase();
  };

  /** Makes a transaction ID that is not already used, e.g. PSK-20481937. */
  T.generateTransactionId = function (channel) {
    var prefix = channel === 'Paystack' ? 'PSK' : channel === 'Remita' ? 'RMT' : 'BNK';
    for (var i = 0; i < 200; i++) {
      var id = prefix + '-' + String(Math.floor(10000000 + Math.random() * 90000000));
      if (!T.findTransactionByTransactionId(id)) return id;
    }
    return prefix + '-' + Date.now();
  };

  /**
   * Turns what a person typed ("50,000" or "1250.50") into integer kobo.
   * Returns { ok, kobo, error }.
   */
  T.parseNairaToKobo = function (input) {
    var text = String(input == null ? '' : input).replace(/[,\s]/g, '').replace(/^₦/, '');
    if (text === '') return { ok: false, kobo: 0, error: 'Enter an amount.' };
    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      return { ok: false, kobo: 0, error: 'Enter a valid amount, for example 50,000 or 1250.50.' };
    }
    var parts = text.split('.');
    var kobo = parseInt(parts[0], 10) * 100 + (parts[1] ? parseInt((parts[1] + '0').slice(0, 2), 10) : 0);
    if (kobo <= 0) return { ok: false, kobo: 0, error: 'Amount must be greater than zero.' };
    return { ok: true, kobo: kobo, error: '' };
  };

  /* ---------- Validation (rules from the brief, section 7.5) ---------- */
  /**
   * input: { transactionId, referenceCode, amountKobo, source, channel, date, time }
   * Returns { valid, errors: { field: message } }. Invalid input is never stored.
   */
  T.validateTransaction = function (input) {
    var errors = {};
    var i = input || {};

    if (!T.normalizeTransactionId(i.transactionId)) {
      errors.transactionId = 'Transaction ID is required.';
    }
    if (!T.normalizeReferenceCode(i.referenceCode)) {
      errors.referenceCode = 'Tuitia reference code is required.';
    }
    if (!Number.isInteger(i.amountKobo)) {
      errors.amount = 'Enter a valid amount.';
    } else if (i.amountKobo <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (i.amountKobo > T.CONFIG.MAX_AMOUNT_KOBO) {
      errors.amount = 'Amount is above the demo limit of ₦50,000,000.';
    }
    if (T.CONFIG.SOURCES.indexOf(i.source) === -1) {
      errors.source = 'Choose a supported payment source.';
    }
    if (T.CONFIG.CHANNELS.indexOf(i.channel) === -1) {
      errors.channel = 'Choose a supported payment channel.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date || '') || isNaN(new Date(i.date + 'T00:00:00').getTime())) {
      errors.date = 'Enter a valid date.';
    } else if (i.date > T.util.todayKey()) {
      errors.date = 'The date cannot be in the future.';
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time || '')) {
      errors.time = 'Enter a valid time.';
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  };

  /* ---------- Reading transactions ---------- */
  T.getTransactions = function () {
    return T.getState().transactions.slice();
  };

  T.getTransaction = function (key) {
    return T.getState().transactions.filter(function (t) {
      return t.id === key || t.transactionId === key;
    })[0] || null;
  };

  T.findTransactionByTransactionId = function (transactionId) {
    var wanted = T.normalizeTransactionId(transactionId);
    if (!wanted) return null;
    return T.getState().transactions.filter(function (t) {
      return T.normalizeTransactionId(t.transactionId) === wanted;
    })[0] || null;
  };
  T.isDuplicateTransactionId = function (transactionId) {
    return !!T.findTransactionByTransactionId(transactionId);
  };

  T.getUnmatchedTransactions = function () {
    return T.getState().transactions.filter(function (t) {
      return t.status === 'unmatched';
    }).sort(T.compareNewestFirst);
  };

  T.getReconciledTransactions = function () {
    return T.getState().transactions.filter(function (t) {
      return t.status === 'reconciled';
    }).sort(T.compareNewestFirst);
  };

  T.getDuplicateAttempts = function () {
    return T.getState().duplicateAttempts.slice().sort(function (a, b) {
      return a.attemptedAt < b.attemptedAt ? 1 : -1;
    });
  };

  T.getRecentTransactions = function (count) {
    return T.getTransactions().sort(T.compareNewestFirst).slice(0, count || 5);
  };

  /* ---------- Sorting ---------- */
  function sortKey(t) {
    return t.date + ' ' + t.time + ' ' + t.createdAt;
  }
  T.compareNewestFirst = function (a, b) {
    var ka = sortKey(a);
    var kb = sortKey(b);
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  };

  /* ---------- Search + filters for the Payments page ---------- */
  T.filterTransactions = function (opts) {
    var o = opts || {};
    var q = String(o.q || '').trim().toLowerCase();
    var list = T.getTransactions().filter(function (t) {
      if (o.status && t.status !== o.status) return false;
      if (o.source && t.source !== o.source) return false;
      if (o.channel && t.channel !== o.channel) return false;
      if (q) {
        var student = t.studentId ? T.getStudent(t.studentId) : null;
        var hay = (t.transactionId + ' ' + t.referenceCode + ' ' + t.source + ' ' + t.channel + ' ' + (student ? student.fullName + ' ' + student.matricNumber : '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var sort = o.sort || 'newest';
    list.sort(function (a, b) {
      if (sort === 'oldest') return -T.compareNewestFirst(a, b);
      if (sort === 'amount-high') return b.amountKobo - a.amountKobo;
      if (sort === 'amount-low') return a.amountKobo - b.amountKobo;
      return T.compareNewestFirst(a, b);
    });
    return list;
  };

  /* ---------- Central totals (used by EVERY dashboard section) ---------- */
  function sumKobo(list) {
    return list.reduce(function (s, t) { return s + t.amountKobo; }, 0);
  }

  T.getTotals = function () {
    var all = T.getTransactions();
    var reconciled = all.filter(function (t) { return t.status === 'reconciled'; });
    var unmatched = all.filter(function (t) { return t.status === 'unmatched'; });
    return {
      transactionCount: all.length,
      receivedKobo: sumKobo(all),
      reconciledKobo: sumKobo(reconciled),
      reconciledCount: reconciled.length,
      unmatchedKobo: sumKobo(unmatched),
      unmatchedCount: unmatched.length,
      duplicateCount: T.getState().duplicateAttempts.length
    };
  };

  /** Figures for one calendar day (default: today). Nothing hard-coded. */
  T.getDailySummary = function (dateKey) {
    var day = dateKey || T.util.todayKey();
    var list = T.getTransactions().filter(function (t) { return t.date === day; });
    var reconciled = list.filter(function (t) { return t.status === 'reconciled'; });
    return {
      date: day,
      receivedKobo: sumKobo(list),
      transactionCount: list.length,
      reconciledKobo: sumKobo(reconciled),
      reconciledCount: reconciled.length,
      unmatchedCount: list.length - reconciled.length
    };
  };

  /** How many students are in each clearance bucket. */
  T.getClearanceCounts = function () {
    var counts = { total: 0, cleared: 0, partial: 0, 'not-cleared': 0, overpaid: 0, outstandingCount: 0, outstandingKobo: 0 };
    T.getAllStudents().forEach(function (s) {
      var fin = T.getStudentFinancials(s);
      counts.total += 1;
      counts[fin.status] += 1;
      if (fin.overpaid) counts.overpaid += 1;
      if (fin.outstandingKobo > 0) {
        counts.outstandingCount += 1;
        counts.outstandingKobo += fin.outstandingKobo;
      }
    });
    return counts;
  };

  /** Students whose valid payments exceed their fees, with the payments behind it. */
  T.getOverpaymentExceptions = function () {
    return T.getAllStudents().map(function (s) {
      var fin = T.getStudentFinancials(s);
      return { student: s, financials: fin, transactions: T.getStudentPaymentHistory(s.id) };
    }).filter(function (row) {
      return row.financials.overpaid;
    });
  };

  /** Items that need an administrator's attention. */
  T.getOperationalAlerts = function () {
    var totals = T.getTotals();
    var counts = T.getClearanceCounts();
    var overs = T.getOverpaymentExceptions();
    var alerts = [];
    if (totals.unmatchedCount > 0) {
      alerts.push({
        id: 'unmatched', level: 'warning', href: '#/bursary/reconciliation',
        title: totals.unmatchedCount + ' unmatched payment' + (totals.unmatchedCount === 1 ? '' : 's'),
        detail: T.util.formatNaira(totals.unmatchedKobo) + ' is waiting for a student to be assigned.'
      });
    }
    if (totals.duplicateCount > 0) {
      alerts.push({
        id: 'duplicates', level: 'info', href: '#/bursary/reconciliation',
        title: totals.duplicateCount + ' duplicate attempt' + (totals.duplicateCount === 1 ? '' : 's') + ' blocked',
        detail: 'Repeated transaction IDs were recorded separately and never counted.'
      });
    }
    if (overs.length > 0) {
      var excess = overs.reduce(function (s, r) { return s + r.financials.overpaymentKobo; }, 0);
      alerts.push({
        id: 'overpayment', level: 'warning', href: '#/bursary/clearance',
        title: overs.length + ' overpayment flag' + (overs.length === 1 ? '' : 's'),
        detail: T.util.formatNaira(excess) + ' above required fees across flagged students.'
      });
    }
    if (counts.outstandingCount > 0) {
      alerts.push({
        id: 'outstanding', level: 'info', href: '#/bursary/clearance',
        title: counts.outstandingCount + ' student' + (counts.outstandingCount === 1 ? '' : 's') + ' with a balance',
        detail: T.util.formatNaira(counts.outstandingKobo) + ' still outstanding in total.'
      });
    }
    return alerts;
  };
})();
