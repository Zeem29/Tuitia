/* ============================================================
   reconciliation.js — the ONE engine that matches payments to students
   ------------------------------------------------------------
   Both the Student Demo and the Bursary Workspace call reconcilePayment().
   There is no second copy of this logic anywhere in the app.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});

  function nextTransactionNumber() {
    var max = 0;
    T.getState().transactions.forEach(function (t) {
      var n = parseInt(String(t.id).replace(/\D/g, ''), 10);
      if (n > max) max = n;
    });
    return max + 1;
  }

  /**
   * Process one incoming (simulated) payment confirmation.
   *
   * input: { transactionId, referenceCode, amountKobo, source, channel, date?, time? }
   * returns: { ok, outcome, message, ... }
   *   outcome is one of: 'reconciled' | 'unmatched' | 'duplicate' | 'invalid'
   */
  T.reconcilePayment = function (input) {
    var raw = input || {};
    var U = T.util;

    // Steps 1-2: receive and validate. Date and time default to "now".
    var candidate = {
      transactionId: raw.transactionId,
      referenceCode: raw.referenceCode,
      amountKobo: raw.amountKobo,
      source: raw.source,
      channel: raw.channel,
      date: raw.date || U.todayKey(),
      time: raw.time || U.nowTime()
    };
    var check = T.validateTransaction(candidate);
    if (!check.valid) {
      return {
        ok: false, outcome: 'invalid', errors: check.errors,
        message: 'This payment confirmation is not valid, so it was not recorded. Please fix the highlighted fields.'
      };
    }

    var transactionId = T.normalizeTransactionId(candidate.transactionId);
    var code = T.normalizeReferenceCode(candidate.referenceCode);
    var state = T.getState();

    // Steps 3-4: a transaction ID can only ever be processed once.
    var original = T.findTransactionByTransactionId(transactionId);
    if (original) {
      var attempt = {
        id: 'dup-' + String(state.duplicateAttempts.length + 1).padStart(3, '0'),
        transactionId: transactionId,
        referenceCode: code,
        amountKobo: candidate.amountKobo,
        source: candidate.source,
        channel: candidate.channel,
        attemptedAt: new Date().toISOString(),
        originalTransactionId: original.id
      };
      state.duplicateAttempts.push(attempt); // kept separately, never counted
      T.saveState();
      T.notify();
      return {
        ok: false, outcome: 'duplicate', duplicate: attempt, original: original,
        message: 'Transaction ID ' + transactionId + ' was already processed, so this repeat was blocked and logged. No money was added.'
      };
    }

    // Steps 5-6: read the reference code and look for an EXACT match.
    var student = T.findStudentByReferenceCode(code);

    var tx = {
      id: 'tx-' + String(nextTransactionNumber()).padStart(3, '0'),
      transactionId: transactionId,
      referenceCode: code,
      amountKobo: candidate.amountKobo,
      source: candidate.source,
      channel: candidate.channel,
      date: candidate.date,
      time: candidate.time,
      status: 'unmatched',
      studentId: null,
      createdAt: new Date().toISOString(),
      reconciliation: null
    };

    if (!student) {
      // Step 7: never guess. Keep it, mark it unmatched, queue it for review.
      tx.reconciliation = {
        method: null,
        reason: T.validateReferenceCode(code)
          ? 'No student holds this reference code'
          : 'Reference code is not in the Tuitia format (TU-XXX-0000-AAA)'
      };
      state.transactions.push(tx);
      T.saveState();
      T.notify();
      return {
        ok: true, outcome: 'unmatched', transaction: tx,
        message: 'The reference code ' + code + ' was not recognised. The payment is safe in the unmatched queue for the bursary to review.'
      };
    }

    // Steps 8-10: associate with the student and mark as reconciled.
    tx.status = 'reconciled';
    tx.studentId = student.id;
    tx.reconciliation = {
      method: 'automatic',
      reconciledAt: new Date().toISOString(),
      note: 'Matched automatically on reference code'
    };
    state.transactions.push(tx);

    // Steps 11-14: totals, balance, clearance and overpayment all come
    // from the ledger, so we only read them back here.
    var financials = T.getStudentFinancials(student);

    // Steps 15-16: save and tell the screens to redraw.
    T.saveState();
    T.notify();
    return {
      ok: true, outcome: 'reconciled', transaction: tx, student: student, financials: financials,
      message: U.formatNaira(tx.amountKobo) + ' was matched to ' + student.fullName + '.' +
        (financials.overpaid ? ' Total paid now exceeds the fees, so an overpayment flag was raised.' : '')
    };
  };

  /**
   * Bursary action: assign an UNMATCHED transaction to a chosen student.
   * `key` is the internal id (tx-020) or the transaction ID.
   */
  T.manuallyReconcilePayment = function (key, studentId) {
    var tx = T.getTransaction(key);
    if (!tx) return { ok: false, message: 'That transaction could not be found.' };
    if (tx.status !== 'unmatched') {
      return { ok: false, message: 'This transaction has already been reconciled.' };
    }
    var student = T.getStudent(studentId);
    if (!student) return { ok: false, message: 'Please choose a student.' };

    var previousReason = tx.reconciliation && tx.reconciliation.reason;
    tx.status = 'reconciled';
    tx.studentId = student.id;
    tx.reconciliation = {
      method: 'manual',
      reconciledAt: new Date().toISOString(),
      note: 'Assigned manually by the bursary administrator',
      previousReason: previousReason || ''
    };
    var financials = T.getStudentFinancials(student);
    T.saveState();
    T.notify();
    return {
      ok: true, transaction: tx, student: student, financials: financials,
      message: T.util.formatNaira(tx.amountKobo) + ' was assigned to ' + student.fullName + '.'
    };
  };
})();
