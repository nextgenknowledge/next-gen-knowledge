/* ==========================================================
   NextGen Knowledge: self-paced course player
   Lessons, quizzes, final exam and certificate.
   Progress is kept in this browser only (no accounts).
   ========================================================== */
(function () {
  'use strict';

  var C = window.COURSE;
  if (!C) return;

  var KEY = 'ngk-course-' + C.id;
  var PASS = C.passPercent || 80;
  var view = document.getElementById('courseView');
  var overview = document.getElementById('courseOverview');
  var player = document.getElementById('coursePlayer');
  var side = document.getElementById('lessonList');

  /* ---------- saved progress ---------- */
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { quizzes: s.quizzes || {}, final: s.final || null, cert: s.cert || null };
    } catch (e) { return { quizzes: {}, final: null, cert: null }; }
  }
  var state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: progress lasts for this visit only */ }
  }

  function track(name, params) {
    // Counts progress through the course; never sends names
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Answer choices appear in a new order each time, so the right answer isn't always in the same spot
  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function passed(n) { var q = state.quizzes[n]; return !!(q && q.passed); }
  function unlocked(n) { return n === 1 || passed(n - 1); }
  function allPassed() { return C.lessons.every(function (l, i) { return passed(i + 1); }); }
  function finalPassed() { return !!(state.final && state.final.passed); }
  function doneCount() { return C.lessons.filter(function (l, i) { return passed(i + 1); }).length + (finalPassed() ? 1 : 0); }
  function totalSteps() { return C.lessons.length + 1; }
  function pct() { return Math.round(doneCount() / totalSteps() * 100); }

  function nextRoute() {
    for (var i = 1; i <= C.lessons.length; i++) if (!passed(i)) return '#lesson-' + i;
    return finalPassed() ? '#certificate' : '#final';
  }

  /* ---------- overview progress ---------- */
  function renderOverview() {
    var started = doneCount() > 0;
    document.querySelectorAll('[data-course-start]').forEach(function (a) {
      a.href = nextRoute();
      a.textContent = finalPassed() ? 'View your certificate' : started ? 'Continue course' : 'Start the course';
    });
    var bar = document.getElementById('overviewProgress');
    if (bar) {
      bar.hidden = !started;
      bar.querySelector('.cp-fill').style.width = pct() + '%';
      bar.querySelector('.cp-label').textContent = pct() + '% complete';
    }
    document.querySelectorAll('[data-syl]').forEach(function (li) {
      var n = +li.getAttribute('data-syl');
      var done = n ? passed(n) : finalPassed();
      li.classList.toggle('done', done);
    });
  }

  /* ---------- sidebar ---------- */
  function renderSide(route) {
    var html = '<div class="cs-progress"><div class="cp-track"><div class="cp-fill" style="width:' + pct() + '%"></div></div><span>' + doneCount() + ' of ' + totalSteps() + ' complete</span></div>' +
      // On phones the lesson list starts folded up, so the video is right at the top
      '<button class="cs-toggle" type="button" aria-expanded="' + menuOpen + '">All lessons</button><ol class="cs-list">';
    C.lessons.forEach(function (l, i) {
      var n = i + 1, lock = !unlocked(n), q = state.quizzes[n];
      var status = passed(n) ? 'done' : lock ? 'locked' : 'open';
      var cur = route.n === n && (route.type === 'lesson' || route.type === 'quiz');
      html += '<li class="cs-item ' + status + (cur ? ' current' : '') + '">' +
        (lock ? '<span class="cs-link" aria-disabled="true">' : '<a class="cs-link" href="#lesson-' + n + '"' + (cur ? ' aria-current="page"' : '') + '>') +
        '<span class="cs-badge" aria-hidden="true">' + (passed(n) ? '✓' : lock ? '🔒' : n) + '</span>' +
        '<span class="cs-text"><small>Lesson ' + n + ' · ' + esc(l.length) + '</small>' + esc(l.title) +
        (q ? '<em>Quiz: ' + q.best + '%</em>' : '') + '</span>' +
        (lock ? '</span>' : '</a>') + '</li>';
    });
    var fl = !allPassed();
    html += '<li class="cs-item ' + (finalPassed() ? 'done' : fl ? 'locked' : 'open') + (route.type === 'final' ? ' current' : '') + '">' +
      (fl ? '<span class="cs-link" aria-disabled="true">' : '<a class="cs-link" href="#final">') +
      '<span class="cs-badge" aria-hidden="true">' + (finalPassed() ? '✓' : fl ? '🔒' : '★') + '</span><span class="cs-text"><small>' + C.final.questions.length + ' questions</small>Final exam' +
      (state.final ? '<em>Best: ' + state.final.best + '%</em>' : '') + '</span>' + (fl ? '</span>' : '</a>') + '</li>';
    var cl = !finalPassed();
    html += '<li class="cs-item ' + (cl ? 'locked' : 'done') + (route.type === 'certificate' ? ' current' : '') + '">' +
      (cl ? '<span class="cs-link" aria-disabled="true">' : '<a class="cs-link" href="#certificate">') +
      '<span class="cs-badge" aria-hidden="true">' + (cl ? '🔒' : '🏅') + '</span><span class="cs-text"><small>Free</small>Certificate</span>' + (cl ? '</span>' : '</a>') + '</li></ol>' +
      '<a class="cs-back" href="#">← All courses</a>';
    side.innerHTML = html;
    side.querySelector('.cs-toggle').addEventListener('click', function () {
      menuOpen = !menuOpen;
      this.setAttribute('aria-expanded', menuOpen);
      side.classList.toggle('menu-open', menuOpen);
    });
  }
  var menuOpen = false;

  /* ---------- lesson ---------- */
  function videoHtml(l) {
    if (l.youtube) {
      return '<div class="cv-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(l.youtube) +
        '?rel=0" title="' + esc(l.title) + ' (video)" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    }
    return '<div class="cv-frame cv-soon"><div><span class="cv-soon-tag">VIDEO COMING SOON</span><p>This lesson\'s video is on its way. You can still read the key ideas below and take the quiz.</p></div></div>';
  }

  function renderLesson(n) {
    var l = C.lessons[n - 1];
    var html = '<div class="cv-head"><div class="kicker">Lesson ' + n + ' of ' + C.lessons.length + ' · ' + esc(l.length) + '</div><h1>' + esc(l.title) + '</h1><p>' + esc(l.summary) + '</p></div>' +
      videoHtml(l) +
      '<div class="cv-notes"><h2>Key ideas</h2><ul>' + l.keyIdeas.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="cv-next"><div><strong>Ready to check what you learned?</strong><span>' + l.quiz.length + ' questions · pass with ' + PASS + '% to unlock ' + (n < C.lessons.length ? 'Lesson ' + (n + 1) : 'the final exam') + '</span></div>' +
      '<a class="btn" href="#quiz-' + n + '">' + (passed(n) ? 'Retake quiz' : 'Take the quiz') + '</a></div>';
    view.innerHTML = html;
  }

  /* ---------- quizzes (lesson quizzes and the final exam) ---------- */
  function renderQuiz(questions, opts) {
    var html = '<div class="cv-head"><div class="kicker">' + esc(opts.kicker) + '</div><h1>' + esc(opts.title) + '</h1><p>' + esc(opts.intro) + '</p></div>' +
      '<form class="quiz" novalidate>';
    questions.forEach(function (q, qi) {
      html += '<fieldset class="qz-q" data-q="' + qi + '"><legend><span class="qz-num">' + (qi + 1) + '</span>' + esc(q.q) + '</legend>';
      shuffled(q.options.length).forEach(function (oi) {
        html += '<label class="qz-opt"><input type="radio" name="q' + qi + '" value="' + oi + '"><span>' + esc(q.options[oi]) + '</span></label>';
      });
      html += '<p class="qz-why" hidden></p></fieldset>';
    });
    html += '<p class="qz-error" role="alert" hidden>Answer every question first.</p>' +
      '<div class="qz-actions"><button class="btn" type="submit">Submit answers</button>' +
      (opts.back ? '<a class="btn btn-ghost" href="' + opts.back + '">Back to lesson</a>' : '') + '</div>' +
      '<div class="qz-result" hidden aria-live="polite"></div></form>';
    view.innerHTML = html;

    var form = view.querySelector('form');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var answers = questions.map(function (q, qi) {
        var c = form.querySelector('input[name="q' + qi + '"]:checked');
        return c ? +c.value : -1;
      });
      var err = form.querySelector('.qz-error');
      if (answers.indexOf(-1) !== -1) {
        err.hidden = false;
        var first = form.querySelector('[data-q="' + answers.indexOf(-1) + '"]');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      err.hidden = true;
      var right = 0;
      questions.forEach(function (q, qi) {
        var fs = form.querySelector('[data-q="' + qi + '"]');
        var ok = answers[qi] === q.answer;
        if (ok) right++;
        fs.classList.add(ok ? 'right' : 'wrong');
        fs.querySelectorAll('.qz-opt').forEach(function (lab) {
          var oi = +lab.querySelector('input').value;
          lab.querySelector('input').disabled = true;
          if (oi === q.answer) lab.classList.add('is-answer');
          else if (oi === answers[qi]) lab.classList.add('is-picked');
        });
        var why = fs.querySelector('.qz-why');
        why.innerHTML = '<b>' + (ok ? 'Correct.' : 'Not quite.') + '</b> ' + esc(q.why);
        why.hidden = false;
      });
      var score = Math.round(right / questions.length * 100);
      var ok = score >= PASS;
      opts.onScore(score, ok);
      form.querySelector('.qz-actions').hidden = true;
      var res = form.querySelector('.qz-result');
      res.className = 'qz-result ' + (ok ? 'pass' : 'fail');
      res.innerHTML = '<div class="qz-score"><span>' + right + '/' + questions.length + '</span><small>' + score + '%</small></div><div><strong>' +
        (ok ? opts.passTitle : 'Almost there!') + '</strong><p>' +
        (ok ? opts.passText : 'You need ' + PASS + '% to pass. Look over the explanations above, then give it another go.') + '</p><div class="qz-actions">' +
        (ok ? '<a class="btn" href="' + opts.next + '">' + esc(opts.nextLabel) + '</a>' : '<button class="btn" type="button" data-retry>Try again</button>' + (opts.back ? '<a class="btn btn-ghost" href="' + opts.back + '">Rewatch the lesson</a>' : '')) +
        '</div></div>';
      res.hidden = false;
      var retry = res.querySelector('[data-retry]');
      if (retry) retry.addEventListener('click', function () { route(); window.scrollTo(0, player.offsetTop - 120); });
      res.scrollIntoView({ behavior: 'smooth', block: 'center' });
      renderSide(parse());
      renderOverview();
    });
  }

  function record(prev, score, ok) {
    return { best: Math.max(score, prev ? prev.best : 0), passed: ok || !!(prev && prev.passed) };
  }

  function renderLessonQuiz(n) {
    var l = C.lessons[n - 1];
    var last = n === C.lessons.length;
    renderQuiz(l.quiz, {
      kicker: 'Lesson ' + n + ' quiz',
      title: l.title,
      intro: l.quiz.length + ' questions. You need ' + PASS + '% to pass, and you can retake it as many times as you like.',
      back: '#lesson-' + n,
      next: last ? '#final' : '#lesson-' + (n + 1),
      nextLabel: last ? 'Go to the final exam' : 'Start Lesson ' + (n + 1),
      passTitle: last ? 'All six lessons done!' : 'Lesson ' + n + ' complete!',
      passText: last ? 'You\'ve unlocked the final exam. Pass it to earn your certificate.' : 'Nice work. Lesson ' + (n + 1) + ' is unlocked.',
      onScore: function (score, ok) {
        var wasPassed = passed(n);
        state.quizzes[n] = record(state.quizzes[n], score, ok);
        save();
        if (ok && !wasPassed) track('course_lesson_passed', { course: C.id, lesson: n });
      }
    });
  }

  function renderFinal() {
    renderQuiz(C.final.questions, {
      kicker: 'Final exam',
      title: C.title,
      intro: C.final.questions.length + ' questions covering all six lessons. Score ' + PASS + '% or higher to earn your certificate. You can retake it if you need to.',
      back: null,
      next: '#certificate',
      nextLabel: 'Get your certificate',
      passTitle: 'You passed the course!',
      passText: 'Congratulations. Your certificate is ready.',
      onScore: function (score, ok) {
        var wasPassed = finalPassed();
        state.final = record(state.final, score, ok);
        if (ok && !state.cert) state.cert = { id: certId(), date: new Date().toISOString().slice(0, 10), name: '' };
        save();
        if (ok && !wasPassed) track('course_completed', { course: C.id, score: score });
      }
    });
  }

  /* ---------- certificate ---------- */
  function certId() {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    var r = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(r);
    for (var i = 0; i < 8; i++) s += a[r[i] % a.length] + (i === 3 ? '-' : '');
    return 'NGK-' + C.code + '-' + s;
  }
  function niceDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function renderCert() {
    var c = state.cert;
    var html = '<div class="cv-head no-print"><div class="kicker">Certificate</div><h1>You did it!</h1><p>Type the name you want on your certificate, then print it or save it as a PDF. Your name stays on this device and is never sent anywhere.</p></div>' +
      '<form class="cert-form no-print"><label for="certName">Name on certificate</label><div class="cert-row"><input id="certName" maxlength="40" autocomplete="off" placeholder="Your name" value="' + esc(c.name) + '"><button class="btn" type="button" data-print>Print or save as PDF</button></div></form>' +
      '<div class="cert" id="certificate">' +
        '<div class="cert-inner">' +
          '<div class="cert-top"><img src="logo.png" alt="" width="64" height="64"><div><b>NEXTGEN KNOWLEDGE</b><span>Certificate of Completion</span></div></div>' +
          '<p class="cert-small">This certifies that</p>' +
          '<p class="cert-name" id="certNameOut">' + esc(c.name || 'Your name') + '</p>' +
          '<p class="cert-small">has successfully completed the course</p>' +
          '<p class="cert-course">' + esc(C.title) + '</p>' +
          '<p class="cert-small">' + C.lessons.length + ' video lessons, ' + C.lessons.length + ' lesson quizzes and a final exam (score: ' + state.final.best + '%)</p>' +
          '<div class="cert-foot"><div><span>' + esc(niceDate(c.date)) + '</span><small>Date completed</small></div><div class="cert-seal" aria-hidden="true">NGK<br>★</div><div><span>' + esc(c.id) + '</span><small>Certificate ID</small></div></div>' +
        '</div>' +
      '</div>' +
      '<p class="cert-note no-print">Want to learn more? Try <a href="https://fincity.dev" target="_blank" rel="noopener">Fin City</a>, our free money game.</p>';
    view.innerHTML = html;
    var input = view.querySelector('#certName'), out = view.querySelector('#certNameOut');
    input.addEventListener('input', function () {
      out.textContent = input.value.trim() || 'Your name';
      state.cert.name = input.value.trim();
      save();
    });
    view.querySelector('[data-print]').addEventListener('click', function () {
      if (!input.value.trim()) { input.focus(); input.classList.add('need'); return; }
      window.print();
    });
  }

  /* ---------- routing ---------- */
  function parse() {
    var h = location.hash.replace('#', '');
    var m = h.match(/^(lesson|quiz)-(\d+)$/);
    if (m) return { type: m[1], n: +m[2] };
    if (h === 'final' || h === 'certificate') return { type: h };
    return { type: 'overview' };
  }

  function route() {
    var r = parse();
    var n = r.n;
    if ((r.type === 'lesson' || r.type === 'quiz') && (!n || n < 1 || n > C.lessons.length)) r = { type: 'overview' };
    // Send people to the furthest step they've unlocked if they jump ahead
    if ((r.type === 'lesson' || r.type === 'quiz') && !unlocked(n)) { location.replace(nextRoute()); return; }
    if (r.type === 'final' && !allPassed()) { location.replace(nextRoute()); return; }
    if (r.type === 'certificate' && !finalPassed()) { location.replace(nextRoute()); return; }

    var inPlayer = r.type !== 'overview';
    overview.hidden = inPlayer;
    player.hidden = !inPlayer;
    renderOverview();
    if (!inPlayer) return;

    renderSide(r);
    if (r.type === 'lesson') renderLesson(n);
    else if (r.type === 'quiz') renderLessonQuiz(n);
    else if (r.type === 'final') renderFinal();
    else renderCert();
    var h1 = view.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  var reset = document.getElementById('resetProgress');
  if (reset) reset.addEventListener('click', function () {
    if (!window.confirm('Start the course over? This clears your quiz scores and certificate on this device.')) return;
    state = { quizzes: {}, final: null, cert: null };
    save();
    location.hash = '';
    route();
  });

  // Each step starts at the top of the page, even after a reload
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', route);
  route();
})();
