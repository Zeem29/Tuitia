/* ============================================================
   engine-tests.js — checks the business logic WITHOUT a browser.
   Run with:   node public/tests/engine-tests.cjs        (from /client)
   It loads the real engine files (no copies) into a fake browser
   environment, then runs each test and prints PASS / FAIL.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '..', 'js');
const files = ['data.js', 'storage.js', 'students.js', 'payments.js', 'reconciliation.js'];

function freshEngine(savedValue) {
  const store = {};
  if (savedValue !== undefined) store['tuitia.demo.state.v1'] = savedValue;
  const ctx = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    addEventListener: () => {},
    console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx));
  ctx.Tuitia.loadState();
  ctx.__store = store;
  return ctx;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS  ' + name);
  } catch (err) {
    failed++;
    console.log('FAIL  ' + name + '\n      ' + err.message);
  }
}
function eq(actual, expected, label) {
  if (actual !== expected) throw new Error((label || 'value') + ': expected ' + expected + ' but got ' + actual);
}

function pay(T, over) {
  return T.reconcilePayment(Object.assign({
    transactionId: 'TEST-' + Math.random().toString(36).slice(2, 10),
    referenceCode: 'TU-BEL-4721-K9P',
    amountKobo: 1000000,
    source: 'Parent',
    channel: 'Paystack'
  }, over));
}

/* ---------- Reference codes ---------- */
test('Seed reference codes are unique and well-formed', () => {
  const T = freshEngine().Tuitia;
  const codes = T.getAllStudents().map((s) => s.referenceCode);
  eq(new Set(codes).size, codes.length, 'unique count');
  codes.forEach((c) => eq(T.validateReferenceCode(c), true, c));
});
test('generateReferenceCode makes a new unique valid code', () => {
  const T = freshEngine().Tuitia;
  const seen = new Set(T.getAllStudents().map((s) => s.referenceCode));
  for (let i = 0; i < 200; i++) {
    const c = T.generateReferenceCode('Ada Lovelace');
    eq(T.validateReferenceCode(c), true, c);
    eq(seen.has(c), false, 'duplicate ' + c);
    seen.add(c);
  }
});
test('Codes survive a reload (saved state is reused, not reseeded)', () => {
  const a = freshEngine();
  const saved = a.__store['tuitia.demo.state.v1'];
  const b = freshEngine(saved);
  eq(b.Tuitia.getStudent('s02').referenceCode, 'TU-BEL-4721-K9P');
});
test('Unknown code finds nobody; padded lower-case known code finds the student', () => {
  const T = freshEngine().Tuitia;
  eq(T.findStudentByReferenceCode('TU-ZZZ-0000-AAA'), null, 'unknown');
  eq(T.findStudentByReferenceCode('  tu-bel-4721-k9p  ').fullName, 'Aisha Bello', 'padded');
  eq(T.findStudentByReferenceCode('TU-BEL-4712-K9P'), null, 'near-miss');
});

/* ---------- Seed consistency ---------- */
test('Seed has >=12 students and >=20 transactions', () => {
  const T = freshEngine().Tuitia;
  eq(T.getAllStudents().length >= 12, true, 'students');
  eq(T.getTransactions().length >= 20, true, 'transactions');
});
test('Seed scenarios: cleared, partial, not cleared, overpaid, unmatched, duplicate', () => {
  const T = freshEngine().Tuitia;
  const c = T.getClearanceCounts();
  eq(c.cleared > 0 && c.partial > 0 && c['not-cleared'] > 0 && c.overpaid > 0, true, 'buckets');
  eq(T.getUnmatchedTransactions().length > 0, true, 'unmatched');
  eq(T.getDuplicateAttempts().length > 0, true, 'duplicate');
});
test('Dashboard totals agree with the individual transactions', () => {
  const T = freshEngine().Tuitia;
  const totals = T.getTotals();
  const sum = T.getTransactions().reduce((s, t) => s + t.amountKobo, 0);
  eq(totals.receivedKobo, sum, 'received');
  eq(totals.receivedKobo, totals.reconciledKobo + totals.unmatchedKobo, 'received = reconciled + unmatched');
  const perStudent = T.getAllStudents().reduce((s, st) => s + T.calculateTotalPaid(st.id), 0);
  eq(perStudent, totals.reconciledKobo, 'per-student paid adds up to reconciled');
});
test('Duplicate attempts never count towards totals', () => {
  const T = freshEngine().Tuitia;
  const before = T.getTotals().receivedKobo;
  eq(T.getState().duplicateAttempts.length > 0, true);
  eq(before, T.getTransactions().reduce((s, t) => s + t.amountKobo, 0), 'ledger sum');
});
test('Today has real activity in the daily summary', () => {
  const T = freshEngine().Tuitia;
  const d = T.getDailySummary();
  eq(d.transactionCount > 0 && d.unmatchedCount > 0 && d.reconciledCount > 0, true);
});

/* ---------- Validation ---------- */
test('Rejects zero, negative, missing id, missing code, bad source and bad channel', () => {
  const T = freshEngine().Tuitia;
  const before = T.getTransactions().length;
  eq(pay(T, { amountKobo: 0 }).outcome, 'invalid', 'zero');
  eq(pay(T, { amountKobo: -500 }).outcome, 'invalid', 'negative');
  eq(pay(T, { amountKobo: NaN }).outcome, 'invalid', 'NaN');
  eq(pay(T, { transactionId: '   ' }).outcome, 'invalid', 'no id');
  eq(pay(T, { referenceCode: '' }).outcome, 'invalid', 'no code');
  eq(pay(T, { source: 'Cash' }).outcome, 'invalid', 'source');
  eq(pay(T, { channel: 'Bitcoin' }).outcome, 'invalid', 'channel');
  eq(T.getTransactions().length, before, 'nothing stored');
});
test('parseNairaToKobo handles commas, decimals and junk', () => {
  const T = freshEngine().Tuitia;
  eq(T.parseNairaToKobo('50,000').kobo, 5000000);
  eq(T.parseNairaToKobo('1250.5').kobo, 125050);
  eq(T.parseNairaToKobo('0.1').kobo, 10);
  eq(T.parseNairaToKobo('abc').ok, false);
  eq(T.parseNairaToKobo('-5').ok, false);
  eq(T.parseNairaToKobo('0').ok, false);
  eq(T.parseNairaToKobo('').ok, false);
});

/* ---------- Reconciliation ---------- */
test('Valid payment is auto-reconciled and updates balance + status', () => {
  const T = freshEngine().Tuitia;
  const aisha = T.getStudent('s02'); // required 200,000; paid 125,000
  eq(T.calculateTotalPaid('s02'), 12500000, 'before paid');
  const r = pay(T, { amountKobo: 3000000 });
  eq(r.outcome, 'reconciled');
  eq(T.calculateTotalPaid('s02'), 15500000, 'after paid');
  eq(T.calculateOutstanding(aisha), 4500000, 'outstanding');
  eq(T.getClearanceStatus(aisha), 'partial');
});
test('Exact completion clears the student; extra payment flags overpayment', () => {
  const T = freshEngine().Tuitia;
  const aisha = T.getStudent('s02');
  pay(T, { amountKobo: 7500000 });
  eq(T.getClearanceStatus(aisha), 'cleared', 'cleared');
  eq(T.calculateOverpayment(aisha), 0, 'no overpay yet');
  pay(T, { amountKobo: 100000 });
  eq(T.calculateOverpayment(aisha), 100000, 'overpayment');
  eq(T.getStudentFinancials(aisha).overpaid, true);
});
test('Student with no payments is Not cleared', () => {
  const T = freshEngine().Tuitia;
  eq(T.getClearanceStatus(T.getStudent('s03')), 'not-cleared');
});
test('Multiple sources accumulate on one student', () => {
  const T = freshEngine().Tuitia;
  const sources = new Set(T.getStudentPaymentHistory('s01').map((t) => t.source));
  eq(sources.size >= 2, true);
});
test('Code with spaces/lower case still matches the right student', () => {
  const T = freshEngine().Tuitia;
  const r = pay(T, { referenceCode: '  tu-oka-2048-h7m ' });
  eq(r.outcome, 'reconciled');
  eq(r.student.fullName, 'Chinedu Okafor');
});
test('Unknown code goes to the unmatched queue and credits nobody', () => {
  const T = freshEngine().Tuitia;
  const totalPaidBefore = T.getAllStudents().reduce((s, st) => s + T.calculateTotalPaid(st.id), 0);
  const r = pay(T, { referenceCode: 'TU-XYZ-0000-AAA', amountKobo: 500000 });
  eq(r.outcome, 'unmatched');
  eq(r.transaction.studentId, null);
  const totalPaidAfter = T.getAllStudents().reduce((s, st) => s + T.calculateTotalPaid(st.id), 0);
  eq(totalPaidAfter, totalPaidBefore, 'student totals unchanged');
  eq(T.getUnmatchedTransactions().some((t) => t.id === r.transaction.id), true, 'in queue');
});
test('Malformed code is unmatched with a format reason', () => {
  const T = freshEngine().Tuitia;
  const r = pay(T, { referenceCode: 'HELLO' });
  eq(r.outcome, 'unmatched');
  eq(/format/i.test(r.transaction.reconciliation.reason), true);
});
test('Duplicate transaction ID is blocked, logged separately, never counted', () => {
  const T = freshEngine().Tuitia;
  const first = pay(T, { transactionId: 'DUP-1', amountKobo: 500000 });
  eq(first.outcome, 'reconciled');
  const paid = T.calculateTotalPaid('s02');
  const txCount = T.getTransactions().length;
  const dupCount = T.getDuplicateAttempts().length;
  const second = pay(T, { transactionId: ' dup-1 ', amountKobo: 500000 });
  eq(second.outcome, 'duplicate');
  eq(T.calculateTotalPaid('s02'), paid, 'paid unchanged');
  eq(T.getTransactions().length, txCount, 'ledger unchanged');
  eq(T.getDuplicateAttempts().length, dupCount + 1, 'logged');
});

/* ---------- Manual reconciliation ---------- */
test('Manual reconciliation moves a payment out of the queue and credits the student', () => {
  const T = freshEngine().Tuitia;
  const tx = T.getUnmatchedTransactions()[0];
  const before = T.calculateTotalPaid('s05');
  const r = T.manuallyReconcilePayment(tx.id, 's05');
  eq(r.ok, true);
  eq(T.calculateTotalPaid('s05'), before + tx.amountKobo, 'credited');
  eq(T.getUnmatchedTransactions().some((t) => t.id === tx.id), false, 'left queue');
  eq(T.getTransaction(tx.id).reconciliation.method, 'manual');
});
test('Repeated manual reconciliation and unknown student are rejected', () => {
  const T = freshEngine().Tuitia;
  const tx = T.getUnmatchedTransactions()[0];
  eq(T.manuallyReconcilePayment(tx.id, 's05').ok, true);
  const paid = T.calculateTotalPaid('s06');
  eq(T.manuallyReconcilePayment(tx.id, 's06').ok, false, 'second time');
  eq(T.calculateTotalPaid('s06'), paid, 'no double credit');
  const tx2 = T.getUnmatchedTransactions()[0];
  eq(T.manuallyReconcilePayment(tx2.id, 'nope').ok, false, 'unknown student');
  eq(T.manuallyReconcilePayment('missing', 's05').ok, false, 'unknown tx');
});

/* ---------- Persistence ---------- */
test('State is saved after a payment and restored on reload', () => {
  const a = freshEngine();
  pay(a.Tuitia, { transactionId: 'PERSIST-1', amountKobo: 1234000 });
  const b = freshEngine(a.__store['tuitia.demo.state.v1']);
  eq(!!b.Tuitia.findTransactionByTransactionId('PERSIST-1'), true);
});
test('Corrupt saved data is replaced with the seed instead of crashing', () => {
  const b = freshEngine('{not json');
  eq(b.Tuitia.getAllStudents().length >= 12, true);
  eq(b.Tuitia.loadWarning.length > 0, true, 'warning set');
  const c = freshEngine(JSON.stringify({ students: 'oops' }));
  eq(c.Tuitia.getAllStudents().length >= 12, true);
});
test('Reset restores the original dataset', () => {
  const T = freshEngine().Tuitia;
  const originalCount = T.getTransactions().length;
  pay(T, { amountKobo: 100000 });
  T.resetState();
  eq(T.getTransactions().length, originalCount);
});

/* ---------- Money ---------- */
test('formatNaira formats whole naira and kobo', () => {
  const T = freshEngine().Tuitia;
  eq(T.util.formatNaira(12500000), '₦125,000');
  eq(T.util.formatNaira(125050), '₦1,250.50');
  eq(T.util.formatNaira(0), '₦0');
});
test('Integer kobo: 0.1 + 0.2 style sums stay exact', () => {
  const T = freshEngine().Tuitia;
  const a = T.parseNairaToKobo('0.10').kobo;
  const b = T.parseNairaToKobo('0.20').kobo;
  eq(a + b, 30);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
