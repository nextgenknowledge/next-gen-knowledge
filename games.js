/* NextGen Knowledge — pocket arcade
   Pop-up mini-games (retro OS windows), the floating PLAY dock, and the
   draggable pixel coins that float around page heroes.
   Open a game from anywhere with: <button data-game="quiz">…</button>
   Games: quiz, printer, divlab */

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const money = v => "$" + Math.round(v).toLocaleString("en-US");
  const icon = id => `<svg class="px-icon" aria-hidden="true"><use href="icons.svg#i-${id}"/></svg>`;

  /* ---------- drag helper (pointer events, ignores tiny moves so clicks still work) ---------- */
  function makeDraggable(target, handle, { onEnd, onMove } = {}) {
    let sx, sy, ox, oy, dragging = false, moved = false;
    handle.addEventListener("pointerdown", e => {
      if (e.button !== 0 || e.target.closest("[data-nodrag]")) return;
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      ox = Number(target.dataset.x || 0); oy = Number(target.dataset.y || 0);
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      target.classList.add("dragging");
      target.dataset.x = ox + dx; target.dataset.y = oy + dy;
      target.style.translate = `${ox + dx}px ${oy + dy}px`;
      onMove && onMove(dx, dy);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      target.classList.remove("dragging");
      onEnd && onEnd(moved);
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; } }, true);
  }

  /* ---------- pop-up windows ---------- */
  const windows = {};

  function openGame(key) {
    const game = GAMES[key];
    if (!game) return;
    closeDockMenu();
    let win = windows[key];
    if (!win) {
      win = el("dialog", "win");
      win.setAttribute("aria-labelledby", "win-title-" + key);
      win.innerHTML = `
        <div class="win-bar">
          <span class="win-title" id="win-title-${key}">${icon(game.icon)} ${game.file}</span>
          <button class="win-close" type="button" data-nodrag aria-label="Close ${game.title}">×</button>
        </div>
        <div class="win-body"></div>`;
      document.body.appendChild(win);
      game.build($(".win-body", win));
      $(".win-close", win).addEventListener("click", () => win.close());
      win.addEventListener("click", e => { if (e.target === win) win.close(); });
      makeDraggable(win, $(".win-bar", win));
      windows[key] = win;
    }
    win.dataset.x = 0; win.dataset.y = 0; win.style.translate = "";
    win.showModal();
    game.onOpen && game.onOpen($(".win-body", win));
  }

  /* static windows written in the page: <dialog class="win" id="x"> opened by data-win="x" */
  document.querySelectorAll("dialog.win").forEach(win => {
    win.querySelector(".win-close").addEventListener("click", () => win.close());
    win.addEventListener("click", e => { if (e.target === win) win.close(); });
    makeDraggable(win, win.querySelector(".win-bar"));
  });

  document.addEventListener("click", e => {
    const launcher = e.target.closest("[data-game]");
    if (launcher) { e.preventDefault(); openGame(launcher.dataset.game); return; }
    const opener = e.target.closest("[data-win]");
    const win = opener && document.getElementById(opener.dataset.win);
    if (win) {
      e.preventDefault();
      closeDockMenu();
      win.dataset.x = 0; win.dataset.y = 0; win.style.translate = "";
      win.showModal();
    }
  });

  /* ================= GAME: MONEY QUIZ ================= */
  const quizQuestions = [
    { category: "Money fundamentals", question: "What is a budget mainly used for?",
      options: ["To guarantee that you never run out of money", "To plan income and expenses", "To increase your income automatically", "To avoid making financial decisions"], answer: 1,
      explanation: "A budget helps you plan where your money goes, compare expenses with income, and make informed choices." },
    { category: "Saving", question: "What is an emergency fund designed to help cover?",
      options: ["Only planned vacations", "Every investment opportunity", "Unexpected expenses", "Regular entertainment purchases"], answer: 2,
      explanation: "An emergency fund can help cover unexpected costs, such as a necessary repair or another unplanned expense." },
    { category: "Investing", question: "What does diversification mean when investing?",
      options: ["Putting all your money into one company", "Spreading investments across different assets", "Buying only investments that recently increased", "Guaranteeing a positive return"], answer: 1,
      explanation: "Diversification spreads exposure across investments. It can reduce some risks, but it cannot eliminate risk or guarantee profits." },
    { category: "Compound growth", question: "What is compound interest?",
      options: ["Interest calculated only on your original deposit", "A fee charged whenever you save", "Interest earned on principal and previously accumulated interest", "A guarantee that your savings will double"], answer: 2,
      explanation: "Compound interest means interest can build on both the original amount and interest accumulated earlier." },
    { category: "Smart decisions", question: "What should you generally compare when evaluating a loan?",
      options: ["Only the monthly payment", "The advertised color and design", "Only how quickly you can receive the money", "Interest rate, fees, repayment term, and total cost"], answer: 3,
      explanation: "A monthly payment is only one part of borrowing. Interest rates, fees, repayment length, and total repayment all matter." }
  ];

  function buildQuiz(body) {
    body.innerHTML = `
      <div class="cabinet">
        <div class="marquee">MONEY QUIZ</div>
        <div class="screen">
          <div class="attract">
            <div>
              <h3>MONEY<br>QUIZ</h3>
              <p>Answer 5 questions about budgeting, saving, investing and borrowing. Every right answer drops a coin.</p>
              <p class="insert" aria-hidden="true">INSERT COIN</p>
              <p class="hiscore">HI-SCORE <b class="hi"></b></p>
              <button class="btn q-start" type="button">Press Start</button>
            </div>
          </div>
          <div class="q-play" hidden>
            <div class="q-hud"><span class="q-step"></span><span class="q-coins"></span></div>
            <div class="progress" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>
            <div class="q-cat"></div>
            <p class="q-text"></p>
            <div class="options"></div>
            <p class="feedback" aria-live="polite"></p>
            <div class="quiz-actions"><button class="btn q-next" type="button" disabled>Next →</button></div>
          </div>
          <div class="result" hidden>
            <div><h3 class="r-head"></h3><p class="r-text"></p><button class="btn q-restart" type="button">Play again</button></div>
          </div>
        </div>
        <div class="controls-deck" aria-hidden="true"><span class="joystick"></span><span class="coin-slot"></span><span class="arcade-btns"><i></i><i></i></span></div>
      </div>`;

    const screen = $(".screen", body), attract = $(".attract", body), play = $(".q-play", body), result = $(".result", body);
    const opts = $(".options", body), fb = $(".feedback", body), next = $(".q-next", body), bar = $(".progress", body);
    let i = 0, correct = 0, locked = false;
    const total = quizQuestions.length;
    const readHi = () => Number(store.get("ngk-hiscore")) || 0;
    const showHi = () => { $(".hi", body).textContent = readHi() + " / " + total; };
    showHi();

    const setProgress = done => {
      const pct = Math.round(done / total * 100);
      $("i", bar).style.width = pct + "%";
      bar.setAttribute("aria-valuenow", String(pct));
    };

    function render() {
      const q = quizQuestions[i];
      locked = false;
      $(".q-step", body).textContent = "QUESTION " + (i + 1) + " OF " + total;
      $(".q-coins", body).textContent = "COINS " + correct;
      $(".q-cat", body).textContent = q.category;
      $(".q-text", body).textContent = q.question;
      setProgress(i);
      fb.className = "feedback"; fb.textContent = "";
      next.disabled = true;
      next.textContent = i === total - 1 ? "See results →" : "Next →";
      opts.replaceChildren(...q.options.map((text, n) => {
        const b = el("button", "option");
        b.type = "button";
        b.append(el("span", "key", String.fromCharCode(65 + n)), Object.assign(el("span"), { textContent: text }));
        b.addEventListener("click", () => choose(n, b));
        return b;
      }));
      opts.firstChild.focus();
    }

    function choose(n, btn) {
      if (locked) return;
      locked = true;
      const q = quizQuestions[i], ok = n === q.answer;
      if (ok) {
        correct++;
        const r = btn.getBoundingClientRect(), h = screen.getBoundingClientRect();
        const pop = el("span", "coin-pop", "+1 COIN");
        pop.style.left = (r.right - h.left - 100) + "px";
        pop.style.top = (r.top - h.top) + "px";
        screen.appendChild(pop);
        setTimeout(() => pop.remove(), 900);
      }
      [...opts.children].forEach((b, k) => {
        b.disabled = true;
        if (k === q.answer) b.classList.add("correct");
        else if (k === n) b.classList.add("incorrect");
      });
      fb.className = "feedback " + (ok ? "good" : "bad");
      fb.textContent = (ok ? "Correct! " : "Not quite. ") + q.explanation;
      $(".q-coins", body).textContent = "COINS " + correct;
      setProgress(i + 1);
      next.disabled = false;
      next.focus();
    }

    function start() {
      i = 0; correct = 0;
      attract.hidden = true; result.hidden = true; play.hidden = false;
      render();
    }

    next.addEventListener("click", () => {
      if (!locked) return;
      if (i < total - 1) { i++; render(); return; }
      play.hidden = true; result.hidden = false;
      const best = Math.max(readHi(), correct);
      store.set("ngk-hiscore", String(best));
      showHi();
      $(".r-head", body).textContent = correct === total ? "PERFECT RUN!" : correct >= 3 ? "NICE WORK!" : "GAME OVER";
      $(".r-text", body).textContent = "You collected " + correct + " of " + total + " coins. " +
        (correct === total ? "That's a perfect score." : "Review the explanations and try again to strengthen your understanding.");
      $(".q-restart", body).focus();
    });
    $(".q-start", body).addEventListener("click", start);
    $(".q-restart", body).addEventListener("click", start);
  }

  /* ================= GAME: CONCEPT PRINTER ================= */
  const facts = [
    ["COMPOUND GROWTH", "Returns can earn their own returns over time, so time in the market matters. Investment returns are never guaranteed."],
    ["INFLATION", "A rise in the general price level. When prices rise, the same amount of money may buy fewer goods and services."],
    ["CREDIT SCORE", "One factor lenders may use to assess borrowing risk. Different scoring models use different information and ranges."],
    ["DIVERSIFICATION", "Spreading money across different investments. It can reduce concentration risk, but it does not guarantee against losses."],
    ["RULE OF 72", "Divide 72 by an annual growth rate to estimate how many years it takes money to double. At 6%, that's about 12 years."],
    ["OPPORTUNITY COST", "Every choice has a price: the next-best thing you gave up. Spending $5 today means that $5 can't be saved or invested."]
  ];

  function buildPrinter(body) {
    body.innerHTML = `
      <p class="win-intro">Big ideas, printed small. Tear one off, learn it, print the next.</p>
      <div class="printer">
        <div class="printer-head" aria-hidden="true"><span class="led"></span></div>
        <div class="receipt zigzag-bottom" aria-live="polite">
          <p class="center">NEXTGEN KNOWLEDGE<br>CONCEPT STORE #001</p>
          <hr>
          <div class="row"><span>ITEM</span><span class="f-count"></span></div>
          <p class="big f-title"></p>
          <hr>
          <p class="f-text"></p>
          <hr>
          <div class="row"><span>SUBTOTAL</span><span>$0.00</span></div>
          <div class="row big"><span>TOTAL</span><span>$0.00</span></div>
          <p class="center" style="margin-top:8px">KNOWLEDGE IS FREE</p>
          <div class="barcode" aria-hidden="true"></div>
        </div>
      </div>
      <div class="win-actions"><button class="btn f-next" type="button">Print another →</button></div>`;
    let n = Math.floor(Math.random() * facts.length);
    const receipt = $(".receipt", body);
    const show = () => {
      $(".f-title", body).textContent = facts[n][0];
      $(".f-text", body).textContent = facts[n][1];
      $(".f-count", body).textContent = String(n + 1).padStart(2, "0") + " / " + String(facts.length).padStart(2, "0");
      receipt.classList.remove("printing"); void receipt.offsetWidth; receipt.classList.add("printing");
    };
    $(".f-next", body).addEventListener("click", () => { n = (n + 1) % facts.length; show(); });
    show();
  }

  /* ================= GAME: DIVERSIFICATION LAB (simulated, illustrative data) ================= */
  function buildDivLab(body) {
    body.innerHTML = `
      <div class="sim">
        <div class="readout-row">
          <div class="big"><small>VIRTUAL PORTFOLIO · 1 YEAR</small><span class="pf">$100,000</span></div>
          <div class="meter"><small>BUMPINESS</small><div class="meter-bar" aria-hidden="true"></div><span class="sr-only meter-text" aria-live="polite"></span></div>
        </div>
        <div class="plot" aria-hidden="true"></div>
        <label for="divStocks">Number of companies held <output class="n-out">1</output></label>
        <input id="divStocks" type="range" min="1" max="20" value="1">
        <p class="sim-note"></p>
        <div class="win-actions spread"><span class="tag green">Simulated data, not real stocks</span><button class="btn btn-ghost btn-small reroll" type="button">Run a new year ↻</button></div>
      </div>`;
    const N_STOCKS = 20, N_WEEKS = 52;
    const input = $("#divStocks", body), plot = $(".plot", body), meter = $(".meter-bar", body);
    let seed = 7, returns = [];
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
    const generate = () => {
      // each company = shared market move + its own company-specific noise
      const market = Array.from({ length: N_WEEKS }, () => 0.0015 + 0.018 * gauss());
      returns = Array.from({ length: N_STOCKS }, () => market.map(m => m + 0.06 * gauss()));
    };
    for (let k = 0; k < 10; k++) meter.appendChild(el("i"));
    for (let k = 0; k < N_WEEKS; k++) plot.appendChild(el("i"));

    function draw() {
      const n = Number(input.value);
      $(".n-out", body).textContent = n;
      let value = 100000;
      const path = [], weekly = [];
      for (let w = 0; w < N_WEEKS; w++) {
        let r = 0;
        for (let s = 0; s < n; s++) r += returns[s][w];
        r /= n;
        weekly.push(r);
        value *= 1 + r;
        path.push(value);
      }
      // fixed scale so a calmer portfolio actually looks calmer
      const lo = 40000, hi = 180000, span = hi - lo;
      [...plot.children].forEach((bar, k) => {
        const v = Math.max(lo, Math.min(hi, path[k]));
        bar.style.height = (8 + (v - lo) / span * 88) + "%";
        bar.classList.toggle("down", path[k] < 100000);
      });
      plot.style.setProperty("--base-n", ((8 + (100000 - lo) / span * 88) / 100).toFixed(3));

      const mean = weekly.reduce((a, b) => a + b, 0) / N_WEEKS;
      const sd = Math.sqrt(weekly.reduce((a, b) => a + (b - mean) ** 2, 0) / N_WEEKS);
      const level = Math.max(1, Math.min(10, Math.round(sd / 0.064 * 10)));
      meter.style.setProperty("--mc", level > 6 ? "var(--red)" : level > 3 ? "var(--gold-bright)" : "var(--green)");
      [...meter.children].forEach((seg, k) => seg.classList.toggle("on", k < level));
      $(".meter-text", body).textContent = "Bumpiness " + level + " out of 10";
      $(".pf", body).textContent = money(value);
      $(".sim-note", body).innerHTML = n === 1
        ? "All eggs in one basket: one company's bad news hits your whole portfolio. <strong>Slide right to spread out.</strong>"
        : n < 6
          ? "Spreading out is already smoothing the ride. Company-specific surprises start to cancel out."
          : "Much smoother. What's left is <strong>market risk</strong>, which diversification can't remove.";
    }
    input.addEventListener("input", draw);
    $(".reroll", body).addEventListener("click", () => { generate(); draw(); });
    generate();
    draw();
  }

  const GAMES = {
    quiz: { title: "Money Quiz", file: "MONEY_QUIZ.EXE", icon: "gamepad", blurb: "5 questions, 5 coins", build: buildQuiz },
    printer: { title: "Concept Printer", file: "CHEAT_SHEET.TXT", icon: "book", blurb: "One money idea at a time", build: buildPrinter },
    divlab: { title: "Diversification Lab", file: "DIVERSIFY.SIM", icon: "chart", blurb: "Spread out, smooth the ride", build: buildDivLab }
  };

  /* ---------- floating PLAY dock (draggable, remembers where you left it) ---------- */
  const dock = el("div", "dock");
  dock.innerHTML = `
    <div class="dock-menu" id="dockMenu" hidden>
      <p class="dock-head">POCKET ARCADE</p>
      ${Object.entries(GAMES).map(([k, g]) => `
        <button type="button" class="dock-item" data-game="${k}">
          <span class="tile">${icon(g.icon)}</span><span><b>${g.title}</b><small>${g.blurb}</small></span>
        </button>`).join("")}
    </div>
    <button type="button" class="dock-btn" aria-expanded="false" aria-controls="dockMenu" title="Drag me anywhere">
      ${icon("gamepad")}<span>PLAY</span>
    </button>`;
  document.body.appendChild(dock);
  const dockBtn = $(".dock-btn", dock), dockMenu = $(".dock-menu", dock);

  function closeDockMenu() { dockMenu.hidden = true; dockBtn.setAttribute("aria-expanded", "false"); }
  dockBtn.addEventListener("click", () => {
    const open = dockMenu.hidden;
    dockMenu.hidden = !open;
    dockBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", e => { if (!dock.contains(e.target)) closeDockMenu(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDockMenu(); });

  const saved = (store.get("ngk-dock") || "").split(",").map(Number);
  function clampDock() {
    const r = dock.getBoundingClientRect();
    let x = Number(dock.dataset.x || 0), y = Number(dock.dataset.y || 0);
    if (r.left < 8) x += 8 - r.left;
    if (r.top < 8) y += 8 - r.top;
    if (r.right > innerWidth - 8) x -= r.right - innerWidth + 8;
    if (r.bottom > innerHeight - 8) y -= r.bottom - innerHeight + 8;
    dock.dataset.x = x; dock.dataset.y = y;
    dock.style.translate = `${x}px ${y}px`;
  }
  if (saved.length === 2 && saved.every(Number.isFinite)) {
    dock.dataset.x = saved[0]; dock.dataset.y = saved[1];
    dock.style.translate = `${saved[0]}px ${saved[1]}px`;
    requestAnimationFrame(clampDock);
  }
  makeDraggable(dock, dockBtn, {
    onEnd(moved) { if (moved) { clampDock(); store.set("ngk-dock", dock.dataset.x + "," + dock.dataset.y); } }
  });
  window.addEventListener("resize", clampDock);

  /* ---------- floating pixel coins in the hero: drift, follow the mouse a little, drag & fling ---------- */
  const hero = $(".hero, .page-hero");
  if (hero) {
    hero.classList.add("has-floaters");
    const layer = el("div", "floaters");
    layer.setAttribute("aria-hidden", "true");
    // keep to the edges so coins never sit on top of text or buttons
    const spots = [[1.5, 14], [47, 4], [96, 10], [2, 88], [50, 95], [96, 84]];
    const kinds = ["coin", "star", "coin", "bulb", "coin", "star"];
    spots.forEach(([x, y], k) => {
      const f = el("span", "floater f-" + kinds[k], icon(kinds[k]));
      f.style.left = x + "%";
      f.style.top = y + "%";
      f.style.setProperty("--d", (5 + (k % 4) * 1.3) + "s");
      f.style.setProperty("--delay", (-k * 0.9) + "s");
      f.dataset.depth = (0.4 + (k % 3) * 0.3).toFixed(2);
      layer.appendChild(f);
      makeDraggable(f, f, {
        onEnd() {
          // spring back home with a little bounce
          f.classList.add("returning");
          f.dataset.x = 0; f.dataset.y = 0;
          f.style.translate = "";
          setTimeout(() => f.classList.remove("returning"), 700);
        }
      });
    });
    hero.prepend(layer);

    if (!reduceMotion && matchMedia("(pointer: fine)").matches) {
      let raf = 0;
      hero.addEventListener("pointermove", e => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = hero.getBoundingClientRect();
          const mx = (e.clientX - r.left) / r.width - .5, my = (e.clientY - r.top) / r.height - .5;
          layer.querySelectorAll(".floater").forEach(f => {
            const d = Number(f.dataset.depth);
            f.style.setProperty("--px", (mx * 40 * d).toFixed(1) + "px");
            f.style.setProperty("--py", (my * 30 * d).toFixed(1) + "px");
          });
        });
      });
    }
  }
})();
