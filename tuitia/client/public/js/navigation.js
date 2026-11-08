/* ============================================================
   navigation.js — routing (URL hash) and the application shell
   ------------------------------------------------------------
   #/welcome            introduction and entry
   #/student            Student Demo
   #/bursary/<section>  overview | payments | reconciliation | students | clearance
   The hash means refresh and the back button both work, and the app
   can even be opened straight from the file system.
   ============================================================ */
(function () {
  'use strict';
  var T = (window.Tuitia = window.Tuitia || {});
  var esc = T.util.escapeHtml;

  var SECTIONS = [
    { key: 'overview', label: 'Overview', icon: 'overview' },
    { key: 'payments', label: 'Payments', icon: 'payments' },
    { key: 'reconciliation', label: 'Reconciliation', icon: 'reconcile' },
    { key: 'students', label: 'Students', icon: 'students' },
    { key: 'clearance', label: 'Clearance', icon: 'clearance' }
  ];

  /** Reads window.location.hash into { mode, section }. */
  T.parseRoute = function () {
    var hash = (window.location.hash || '').replace(/^#\/?/, '');
    var parts = hash.split('?');
    var path = parts[0].split('/').filter(Boolean);
    var query = {};
    (parts[1] || '').split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    if (path[0] === 'student') return { mode: 'student', section: '', query: query };
    if (path[0] === 'bursary') {
      var known = path[1] === 'alerts' || SECTIONS.some(function (s) { return s.key === path[1]; });
      return { mode: 'bursary', section: known ? path[1] : 'overview', query: query };
    }
    if (path[0] === 'welcome') return { mode: 'welcome', section: '', query: query };
    return { mode: 'student', section: '', query: query };
  };

  /* ---------- Pieces of the shell ---------- */
  function brand(extraClass) {
    return '<a class="brand ' + (extraClass || '') + '" href="#/welcome" aria-label="Tuitia home">' +
      '<img class="brand__logo" src="assets/logo.png" alt="" width="28" height="28" /><span class="brand__name">Tuitia</span></a>';
  }
  function demoBar(route) {
    return '<div class="demobar"><div class="demobar__inner">' +
      (route.mode === 'bursary' ? '' : brand('brand--light demobar__brand')) +
      '<p class="demobar__label"><span class="demobar__pill">Demo</span><span class="demobar__text">Fictional students. Simulated payments. No real money moves.</span></p>' +
      '<nav class="switch" aria-label="Choose experience">' +
      '<a class="switch__btn' + (route.mode === 'student' ? ' is-active' : '') + '" href="#/student">Student Demo</a>' +
      '<a class="switch__btn' + (route.mode === 'bursary' ? ' is-active' : '') + '" href="#/bursary/overview">Bursary Workspace</a></nav>' +
      '<a class="demobar__about' + (route.mode === 'welcome' ? ' is-active' : '') + '" href="#/welcome">About this demo</a>' +
      '<button type="button" class="demobar__reset" data-action="reset-demo" aria-label="Reset demo data">' + T.icon('reset', 15) + '<span>Reset demo data</span></button>' +
      '</div></div>';
  }

  function sidebar(route) {
    return '<aside class="sidebar">' + brand('brand--light') +
      '<p class="sidebar__caption">Bursary Workspace</p>' +
      '<nav aria-label="Bursary sections"><ul class="nav">' + SECTIONS.map(function (s) {
        var active = route.section === s.key;
        return '<li><a class="nav__link' + (active ? ' is-active' : '') + '" href="#/bursary/' + s.key + '"' + (active ? ' aria-current="page"' : '') + '>' + T.icon(s.icon, 18) + '<span class="nav__label">' + esc(s.label) + '</span>' + navBadge(s.key, false) + '</a></li>';
      }).join('') + '</ul></nav>' +
      '<p class="sidebar__note">Tuitia sits on top of existing payment providers. It organises confirmations after payments happen and never holds or moves money.</p></aside>';
  }

  function bottomNav(route) {
    return '<nav class="bottomnav" aria-label="Bursary sections"><ul>' + SECTIONS.map(function (s) {
      var active = route.section === s.key;
      return '<li><a class="bottomnav__link' + (active ? ' is-active' : '') + '" href="#/bursary/' + s.key + '"' + (active ? ' aria-current="page"' : '') + '>' + T.icon(s.icon, 20) + '<span>' + esc(s.label) + '</span>' + navBadge(s.key, true) + '</a></li>';
    }).join('') + '</ul></nav>';
  }

  function attentionCount() {
    var totals = T.getTotals();
    return totals.unmatchedCount;
  }
  /** The small alert number on a nav item. Empty string when there is nothing to show. */
  function navBadge(key, forBottom) {
    if (key !== 'reconciliation') return '';
    var n = attentionCount();
    if (!n) return '';
    return '<span class="nav__count num' + (forBottom ? ' nav__count--bottom' : '') + '" aria-label="' + n + ' unmatched payments">' + n + '</span>';
  }

  function bursaryHeader(view) {
    var s = T.getState().settings;
    var n = attentionCount();
    var onAlerts = T.parseRoute().section === 'alerts';
    return '<header class="page-head"><div class="page-head__text">' + brand('brand-mobile') + '<h1 class="page-title">' + esc(view.title) + '</h1><p class="page-desc">' + esc(view.description || '') + '</p></div>' +
      '<div class="page-head__tools">' + (view.actions || '') +
      '<a class="icon-btn icon-btn--bell' + (onAlerts ? ' is-active' : '') + '" href="#/bursary/alerts"' + (onAlerts ? ' aria-current="page"' : '') + ' aria-label="' + n + ' items need attention">' + T.icon('bell', 20) + (n ? '<span class="bell-count num">' + n + '</span>' : '') + '</a>' +
      '<div class="profile"><span class="avatar" aria-hidden="true">' + esc(T.util.initials(s.adminName)) + '</span><div class="profile__text"><span class="profile__name">' + esc(s.adminName) + '</span><span class="profile__role">' + esc(s.adminRole) + '</span></div></div></div></header>';
  }

  /* ---------- Welcome / entry screen ---------- */
  function welcome() {
    var steps = [
      ['A payment confirmation arrives', 'From a bank transfer, Paystack or Remita, a confirmation is received.'],
      ['Tuitia reads the reference code', 'Every student has a unique code that travels with each payment.'],
      ['It is matched, or queued', 'An exact match updates the student at once. Anything else waits safely for review.'],
      ['Everyone sees one clear picture', 'Balances, clearance and alerts all come from the same ledger.']
    ];
    return '<div class="welcome">' +
      '<section class="welcome__hero"><p class="eyebrow">Financial operations for universities</p>' +
      '<h1 class="welcome__title">Every naira. Every source. One clear picture.</h1>' +
      '<p class="welcome__lead">University fees are often paid by parents, guardians, scholarships and loan bodies through different channels. Tuitia brings them together and matches each payment to the right student.</p>' +
      '<div class="welcome__cards">' +
      '<a class="entry entry--student" href="#/student"><span class="entry__tag">Student Demo</span><span class="entry__title">See what a student sees</span><span class="entry__go">Open ' + T.icon('arrow', 16) + '</span></a>' +
      '<a class="entry entry--bursary" href="#/bursary/overview"><span class="entry__tag">Bursary Workspace</span><span class="entry__title">See what the bursary sees</span><span class="entry__go">Open ' + T.icon('arrow', 16) + '</span></a></div></section>' +
      '<section class="welcome__section"><h2 class="section-title">How it works</h2><ol class="steps">' + steps.map(function (s, i) {
        return '<li class="step"><span class="step__n num">' + (i + 1) + '</span><div><p class="step__title">' + esc(s[0]) + '</p><p class="small muted">' + esc(s[1]) + '</p></div></li>';
      }).join('') + '</ol></section>' +
      '<section class="welcome__section welcome__notes"><div class="card"><h2 class="card-title">What it is</h2><ul class="bullets"><li>A demonstration with fictional students and simulated payments.</li><li>One reconciliation engine shared by every screen.</li></ul></div>' +
      '<div class="card"><h2 class="card-title">What it is not</h2><ul class="bullets"><li>Not a payment processor. No real money moves.</li><li>Not a replacement for your bank or student records system.</li></ul></div></section>' +
      '</div>';
  }

  /* ---------- Rendering ---------- */
  var lastRouteKey = null;

  function currentView(route) {
    if (route.mode === 'student') return T.renderStudentView();
    if (route.mode === 'bursary') return T.bursaryViews[route.section]();
    return { html: welcome() };
  }

  function safeView(route) {
    try {
      return currentView(route);
    } catch (err) {
      if (window.console) console.error('Tuitia view failed:', err);
      return {
        title: 'Something went wrong',
        description: 'This section could not be shown.',
        html: T.emptyState('This section could not load', 'Your data is safe. Try refreshing the page or use Reset demo.')
      };
    }
  }

  function pageHtml(route, view) {
    if (route.mode === 'bursary') return bursaryHeader(view) + '<div class="content" id="content">' + view.html + '</div>';
    if (route.mode === 'student') return '<div class="content content--narrow">' + view.html + '</div>';
    return view.html;
  }

  var TITLES = { welcome: 'Tuitia — Every naira. Every source. One clear picture.', student: 'Student Demo — Tuitia' };
  /** Full render (route changed): demo bar, sidebar and page. */
  T.renderApp = function () {
    var route = T.parseRoute();
    if (route.mode === 'bursary' && route.section === 'clearance' && route.query && route.query.filter) {
      var allowed = ['all', 'cleared', 'partial', 'not-cleared', 'overpaid'];
      if (allowed.indexOf(route.query.filter) !== -1) T.ui.clearance.filter = route.query.filter;
    }
    var view = safeView(route);
    var root = document.getElementById('root');
    var key = route.mode + '/' + route.section;

    root.innerHTML =
      '<a class="skip-link" href="#main" onclick="var m=document.getElementById(\'main\');if(m){m.focus();}return false;">Skip to main content</a>' + demoBar(route) +
      '<div class="app app--' + route.mode + '">' +
      (route.mode === 'bursary' ? sidebar(route) : '') +
      '<div class="app__body">' +
      '<main id="main" tabindex="-1"><div id="page">' + pageHtml(route, view) + '</div></main></div>' +
      (route.mode === 'bursary' ? bottomNav(route) : '') + '</div>';

    document.title = route.mode === 'bursary' ? (view.title + ' — Tuitia Bursary Workspace') : (TITLES[route.mode] || TITLES.student);
    if (key !== lastRouteKey) {
      window.scrollTo(0, 0);
      var main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
      lastRouteKey = key;
    }
  };

  /* Light re-render helpers (data changed): only the page area, keeps scroll and focus. */
  /** Keeps the Reconciliation alert number in the side and bottom navigation up to date. */
  function syncNavBadges() {
    document.querySelectorAll('a[href="#/bursary/reconciliation"]').forEach(function (link) {
      var old = link.querySelector('.nav__count');
      if (old) old.remove();
      var html = navBadge('reconciliation', link.classList.contains('bottomnav__link'));
      if (html) link.insertAdjacentHTML('beforeend', html);
    });
  }

  T.refreshPage = function () {
    var route = T.parseRoute();
    var page = document.getElementById('page');
    if (!page) { T.renderApp(); return; }
    var view = safeView(route);
    var scrollY = window.scrollY;
    var active = document.activeElement;
    var activeId = active && active.id;
    page.innerHTML = pageHtml(route, view);
    syncNavBadges();
    window.scrollTo(0, scrollY);
    if (activeId) {
      var again = document.getElementById(activeId);
      if (again && again.focus) again.focus();
    }
  };

  /** Redraw only the results area of the current page (search and filters). */
  T.refreshResults = function (view) {
    var box = document.getElementById('results');
    var fn = T.resultRenderers[view];
    if (box && fn) box.innerHTML = fn();
  };

  T.navigate = function (hash) {
    window.location.hash = hash;
  };
})();
