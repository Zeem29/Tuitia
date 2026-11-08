/* ============================================================
   students.js — student lookups, reference codes and per-student money
   ------------------------------------------------------------
   Balances are NEVER stored. They are calculated here from the
   transaction ledger every time, so every screen agrees.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});

  /* ---------- Reference codes: TU-BAB-4721-K9P ---------- */
  var CODE_PATTERN = /^TU-[A-Z]{3}-\d{4}-[A-Z0-9]{3}$/;
  // No I, O, 0 or 1 in the last block: they are easy to misread.
  var SUFFIX_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /** Trim stray spaces and use upper case so matching is consistent. */
  T.normalizeReferenceCode = function (code) {
    return String(code == null ? '' : code).trim().toUpperCase();
  };

  /** Is this code in the correct Tuitia format? (Says nothing about who owns it.) */
  T.validateReferenceCode = function (code) {
    return CODE_PATTERN.test(T.normalizeReferenceCode(code));
  };

  T.isReferenceCodeTaken = function (code) {
    var wanted = T.normalizeReferenceCode(code);
    return T.getState().students.some(function (s) {
      return T.normalizeReferenceCode(s.referenceCode) === wanted;
    });
  };

  /** Builds a new code from a student's surname and checks it is not taken. */
  T.generateReferenceCode = function (fullName) {
    var surname = String(fullName || '').trim().split(/\s+/).pop().toUpperCase().replace(/[^A-Z]/g, '');
    var prefix = (surname + 'XXX').slice(0, 3);
    for (var attempt = 0; attempt < 500; attempt++) {
      var digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      var suffix = '';
      for (var i = 0; i < 3; i++) {
        suffix += SUFFIX_CHARS.charAt(Math.floor(Math.random() * SUFFIX_CHARS.length));
      }
      var code = 'TU-' + prefix + '-' + digits + '-' + suffix;
      if (!T.isReferenceCodeTaken(code)) return code;
    }
    throw new Error('Could not generate a unique reference code');
  };

  /** EXACT match only. Unknown codes return null — never a "closest" guess. */
  T.findStudentByReferenceCode = function (code) {
    var wanted = T.normalizeReferenceCode(code);
    if (!wanted) return null;
    var list = T.getState().students;
    for (var i = 0; i < list.length; i++) {
      if (T.normalizeReferenceCode(list[i].referenceCode) === wanted) return list[i];
    }
    return null;
  };

  /* ---------- Lookups ---------- */
  T.getAllStudents = function () {
    return T.getState().students.slice();
  };
  T.getStudent = function (id) {
    var list = T.getState().students;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  };

  T.findStudentByMatric = function (matric) {
    var wanted = String(matric || '').trim().toUpperCase();
    return T.getState().students.filter(function (s) {
      return s.matricNumber.toUpperCase() === wanted;
    })[0] || null;
  };

  /* ---------- Money for one student (all derived from the ledger) ---------- */

  /** Only RECONCILED transactions count. Unmatched and duplicate items never do. */
  T.getStudentPaymentHistory = function (studentId) {
    return T.getState().transactions
      .filter(function (t) {
        return t.status === 'reconciled' && t.studentId === studentId;
      })
      .sort(T.compareNewestFirst);
  };

  T.calculateTotalPaid = function (studentId) {
    return T.getStudentPaymentHistory(studentId).reduce(function (sum, t) {
      return sum + t.amountKobo;
    }, 0);
  };

  T.calculateOutstanding = function (student) {
    return Math.max(0, student.requiredFees - T.calculateTotalPaid(student.id));
  };

  /** Overpayment = total valid payments - required fees (never negative). */
  T.calculateOverpayment = function (student) {
    return Math.max(0, T.calculateTotalPaid(student.id) - student.requiredFees);
  };

  /** 'not-cleared' | 'partial' | 'cleared' */
  T.getClearanceStatus = function (student) {
    var paid = T.calculateTotalPaid(student.id);
    if (paid <= 0) return 'not-cleared';
    if (paid >= student.requiredFees) return 'cleared';
    return 'partial';
  };

  T.CLEARANCE_LABELS = {
    cleared: 'Cleared',
    partial: 'Partially paid',
    'not-cleared': 'Not cleared'
  };

  /** Everything the screens need about one student's money, in one object. */
  T.getStudentFinancials = function (student) {
    var paid = T.calculateTotalPaid(student.id);
    var over = Math.max(0, paid - student.requiredFees);
    var pct = student.requiredFees > 0 ? Math.min(100, Math.round((paid / student.requiredFees) * 100)) : 0;
    return {
      requiredKobo: student.requiredFees,
      paidKobo: paid,
      outstandingKobo: Math.max(0, student.requiredFees - paid),
      overpaymentKobo: over,
      overpaid: over > 0,
      status: T.getClearanceStatus(student),
      percent: pct
    };
  };

  /* ---------- Search + filters (all combine together) ---------- */
  T.searchStudents = function (query, filters) {
    var q = String(query || '').trim().toLowerCase();
    var f = filters || {};
    return T.getState().students.filter(function (s) {
      if (q) {
        var haystack = (s.fullName + ' ' + s.matricNumber + ' ' + s.referenceCode).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (f.faculty && s.faculty !== f.faculty) return false;
      if (f.department && s.department !== f.department) return false;
      if (f.status) {
        var fin = T.getStudentFinancials(s);
        if (f.status === 'overpaid') {
          if (!fin.overpaid) return false;
        } else if (fin.status !== f.status) {
          return false;
        }
      }
      return true;
    });
  };

  T.getFaculties = function () {
    return unique(T.getState().students.map(function (s) { return s.faculty; })).sort();
  };

  T.getDepartments = function () {
    return unique(T.getState().students.map(function (s) { return s.department; })).sort();
  };

  function unique(list) {
    return list.filter(function (v, i) { return list.indexOf(v) === i; });
  }
})();
