/* ============================================================
   data.js — configuration, small helper functions and the demo data
   ------------------------------------------------------------
   Everything in Tuitia hangs off one global object called `Tuitia`
   (written T inside each file). Each file adds its own functions to it.
   Money is ALWAYS stored as whole kobo (1 naira = 100 kobo) so we never
   hit floating-point rounding errors.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});

  /* ---------- Configuration ---------- */
  T.CONFIG = {
    STORAGE_KEY: 'tuitia.demo.state.v1',
    SOURCES: ['Parent', 'Guardian', 'Student', 'Scholarship', 'Student loan'],
    CHANNELS: ['Bank transfer', 'Paystack', 'Remita'],
    MAX_AMOUNT_KOBO: 5000000000, // ₦50,000,000 — a sanity ceiling for the demo
    PAGE_SIZE: 10
  };

  /* ---------- Small pure helpers ---------- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  T.util = {
    pad2: pad2,

    /** Date -> "YYYY-MM-DD" using the browser's local calendar day. */
    dateKey: function (d) {
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    },
    todayKey: function () {
      return T.util.dateKey(new Date());
    },

    daysAgoKey: function (n) {
      var d = new Date();
      d.setDate(d.getDate() - n);
      return T.util.dateKey(d);
    },

    nowTime: function () {
      var d = new Date();
      return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    },

    /** "YYYY-MM-DD" + "HH:MM" -> ISO timestamp string. */
    toIso: function (dateKey, time) {
      var p = dateKey.split('-');
      var t = (time || '00:00').split(':');
      return new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]).toISOString();
    },

    /** 12500000 kobo -> "₦125,000". Shows kobo only when there are some. */
    formatNaira: function (kobo) {
      var n = Math.round(Number(kobo) || 0);
      var sign = n < 0 ? '-' : '';
      n = Math.abs(n);
      var whole = String(Math.floor(n / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      var rest = n % 100;
      return sign + '₦' + whole + (rest ? '.' + pad2(rest) : '');
    },

    /** "2026-11-06" -> "6 Nov 2026" */
    formatDate: function (key) {
      var p = String(key || '').split('-');
      if (p.length !== 3) return '—';
      return +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0];
    },

    escapeHtml: function (value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    initials: function (name) {
      var parts = String(name || '').trim().split(/\s+/);
      var first = parts[0] ? parts[0].charAt(0) : '';
      var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
      return (first + last).toUpperCase();
    }
  };

  /* ---------- Demo seed data ----------
     Everything below is FICTIONAL. Dates are written as "days ago" so the
     "today" figures on the dashboard always have real activity.
     No totals are typed in anywhere: every balance is calculated live
     from these transaction rows. */
  T.buildSeedState = function () {
    var U = T.util;

    var students = [
      ['Chinedu Okafor', 'FU/21/CSC/0412', 'Faculty of Science', 'Computer Science', 400, 250000, 'TU-OKA-2048-H7M'],
      ['Aisha Bello', 'FU/20/LAW/0187', 'Faculty of Law', 'Public Law', 400, 200000, 'TU-BEL-4721-K9P'],
      ['Tunde Adebayo', 'FU/22/CVE/0311', 'Faculty of Engineering', 'Civil Engineering', 300, 180000, 'TU-ADE-5532-M3X'],
      ['Ngozi Eze', 'FU/23/ENG/0954', 'Faculty of Arts', 'English', 200, 180000, 'TU-EZE-7316-P2D'],
      ['Ibrahim Musa', 'FU/19/MEE/0126', 'Faculty of Engineering', 'Mechanical Engineering', 500, 300000, 'TU-MUS-8863-R5W'],
      ['Folake Adeyemi', 'FU/21/ECO/0639', 'Faculty of Social Sciences', 'Economics', 300, 220000, 'TU-ADE-3094-L6N'],
      ['Emeka Nwosu', 'FU/20/BCH/0275', 'Faculty of Science', 'Biochemistry', 400, 250000, 'TU-NWO-1657-C4T'],
      ['Zainab Yusuf', 'FU/22/NSC/0498', 'Faculty of Health Sciences', 'Nursing Science', 300, 260000, 'TU-YUS-9120-V8F'],
      ['Oluwaseun Balogun', 'FU/20/EEE/0733', 'Faculty of Engineering', 'Electrical Engineering', 400, 280000, 'TU-BAL-6485-G7H'],
      ['Hauwa Garba', 'FU/23/POL/0861', 'Faculty of Social Sciences', 'Political Science', 200, 190000, 'TU-GAR-2279-J3K'],
      ['Kelechi Obi', 'FU/21/ACC/0524', 'Faculty of Management Sciences', 'Accounting', 300, 210000, 'TU-OBI-4408-B9Z'],
      ['Damilola Ogunleye', 'FU/22/MAC/0392', 'Faculty of Arts', 'Mass Communication', 300, 200000, 'TU-OGU-5871-S2Y']
    ].map(function (r, i) {
      return {
        id: 's' + U.pad2(i + 1),
        fullName: r[0],
        matricNumber: r[1],
        faculty: r[2],
        department: r[3],
        level: r[4],
        requiredFees: r[5] * 100, // kobo
        referenceCode: r[6],
        createdAt: U.toIso(U.daysAgoKey(90), '09:00')
      };
    });

    // [transactionId, student number (1-based) or null, code if unmatched,
    //  naira, source, channel, days ago, time]
    var rows = [
      ['PSK-20481937', 1, '', 150000, 'Parent', 'Paystack', 34, '10:12'],
      ['RMT-70331845', 1, '', 100000, 'Scholarship', 'Remita', 21, '14:05'],
      ['BNK-55102938', 2, '', 50000, 'Student', 'Bank transfer', 18, '09:30'],
      ['PSK-20563311', 2, '', 75000, 'Parent', 'Paystack', 12, '16:48'],
      ['BNK-55177402', 4, '', 120000, 'Parent', 'Bank transfer', 27, '11:20'],
      ['RMT-70358120', 4, '', 80000, 'Scholarship', 'Remita', 15, '13:15'],
      ['RMT-70362217', 5, '', 150000, 'Student loan', 'Remita', 19, '15:22'],
      ['BNK-55203319', 5, '', 100000, 'Guardian', 'Bank transfer', 8, '10:41'],
      ['PSK-20601774', 6, '', 70000, 'Parent', 'Paystack', 26, '12:03'],
      ['BNK-55231846', 6, '', 80000, 'Guardian', 'Bank transfer', 14, '09:18'],
      ['PSK-20644902', 6, '', 70000, 'Student', 'Paystack', 5, '17:30'],
      ['BNK-55250067', 7, '', 60000, 'Parent', 'Bank transfer', 9, '11:55'],
      ['PSK-20688513', 7, '', 30000, 'Student', 'Paystack', 1, '18:12'],
      ['PSK-20702346', 9, '', 130000, 'Parent', 'Paystack', 3, '14:36'],
      ['PSK-20731195', 9, '', 50000, 'Student', 'Paystack', 0, '08:47'],
      ['RMT-70391054', 10, '', 190000, 'Parent', 'Remita', 2, '13:09'],
      ['BNK-55288430', 11, '', 40000, 'Student', 'Bank transfer', 6, '16:20'],
      ['PSK-20745608', 11, '', 60000, 'Guardian', 'Paystack', 0, '09:41'],
      // Unmatched: the reference code does not belong to any student.
      ['RMT-70402291', null, 'TU-ELE-9931-Q4R', 85000, 'Guardian', 'Remita', 0, '08:52'],
      ['BNK-55301775', null, 'TU-BEL-4712-K9P', 60000, 'Parent', 'Bank transfer', 1, '15:40'],
      ['PSK-20760932', null, 'TU-MUS-1178-T8C', 25000, 'Student', 'Paystack', 3, '19:05']
    ];

    var transactions = rows.map(function (r, i) {
      var student = r[1] ? students[r[1] - 1] : null;
      var date = U.daysAgoKey(r[6]);
      var createdAt = U.toIso(date, r[7]);
      var tx = {
        id: 'tx-' + String(i + 1).padStart(3, '0'),
        transactionId: r[0],
        referenceCode: student ? student.referenceCode : r[2],
        amountKobo: r[3] * 100,
        source: r[4],
        channel: r[5],
        date: date,
        time: r[7],
        status: student ? 'reconciled' : 'unmatched',
        studentId: student ? student.id : null,
        createdAt: createdAt,
        reconciliation: student
          ? { method: 'automatic', reconciledAt: createdAt, note: 'Matched automatically on reference code' }
          : { method: null, reason: 'No student holds this reference code' }
      };
      return tx;
    });

    // A repeat of an already-processed transaction ID (kept separately,
    // never counted towards any total).
    var original = transactions.filter(function (t) {
      return t.transactionId === 'PSK-20745608';
    })[0];
    var duplicateAttempts = [
      {
        id: 'dup-001',
        transactionId: original.transactionId,
        referenceCode: original.referenceCode,
        amountKobo: original.amountKobo,
        source: original.source,
        channel: original.channel,
        attemptedAt: U.toIso(U.todayKey(), '10:07'),
        originalTransactionId: original.id
      }
    ];

    return {
      version: 1,
      students: students,
      transactions: transactions,
      duplicateAttempts: duplicateAttempts,
      settings: {
        demoStudentId: 's02',
        institution: 'Demo University (fictional)',
        adminName: 'Folasade Adekunle',
        adminRole: 'Bursary Administrator'
      }
    };
  };
})();
