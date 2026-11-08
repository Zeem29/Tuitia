/* ============================================================
   storage.js — the ONE central application state + localStorage
   ------------------------------------------------------------
   state = { students, transactions, duplicateAttempts, settings }
   Every page reads from this object. Nothing keeps its own copy of the
   financial figures. After any change we call T.saveState() and then
   T.notify() so the screen redraws from the new state.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});

  T.state = null;
  T.loadWarning = ''; // set if saved data was unreadable and had to be replaced
  var listeners = [];

  /** Light sanity check so corrupted localStorage can never crash the app. */
  function isValidState(s) {
    if (!s || typeof s !== 'object') return false;
    if (!Array.isArray(s.students) || s.students.length === 0) return false;
    if (!Array.isArray(s.transactions) || !Array.isArray(s.duplicateAttempts)) return false;
    if (!s.settings || typeof s.settings !== 'object') return false;
    var studentsOk = s.students.every(function (st) {
      return st && typeof st.id === 'string' && typeof st.referenceCode === 'string' &&
        typeof st.fullName === 'string' && Number.isInteger(st.requiredFees);
    });
    var txOk = s.transactions.every(function (t) {
      return t && typeof t.id === 'string' && typeof t.transactionId === 'string' &&
        Number.isInteger(t.amountKobo) && (t.status === 'reconciled' || t.status === 'unmatched');
    });
    return studentsOk && txOk;
  }
  T.saveState = function () {
    try {
      window.localStorage.setItem(T.CONFIG.STORAGE_KEY, JSON.stringify(T.state));
      return true;
    } catch (err) {
      return false; // storage full or blocked: the app still works in memory
    }
  };

  /** Loads saved data; only seeds the demo data when nothing valid is saved. */
  T.loadState = function () {
    var raw = null;
    try {
      raw = window.localStorage.getItem(T.CONFIG.STORAGE_KEY);
    } catch (err) {
      raw = null;
    }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (isValidState(parsed)) {
          T.state = parsed;
          return T.state;
        }
      } catch (err) {
        /* fall through to reseed */
      }
      T.loadWarning = 'Saved demo data could not be read, so the original demo data was restored.';
    }
    T.state = T.buildSeedState();
    T.saveState();
    return T.state;
  };

  T.getState = function () {
    return T.state || T.loadState();
  };

  /** Restore the original demo dataset (always asked for with a confirmation). */
  T.resetState = function () {
    T.state = T.buildSeedState();
    T.saveState();
    T.notify();
  };

  /** Register a function to run whenever the data changes. */
  T.subscribe = function (fn) {
    listeners.push(fn);
  };

  T.notify = function () {
    listeners.forEach(function (fn) {
      try {
        fn();
      } catch (err) {
        if (window.console) console.error('Tuitia listener failed', err);
      }
    });
  };

  /** Other browser tabs: pick up their changes so both tabs agree. */
  window.addEventListener('storage', function (e) {
    if (e.key !== T.CONFIG.STORAGE_KEY || !e.newValue) return;
    try {
      var parsed = JSON.parse(e.newValue);
      if (isValidState(parsed)) {
        T.state = parsed;
        T.notify();
      }
    } catch (err) {
      /* ignore */
    }
  });
})();
