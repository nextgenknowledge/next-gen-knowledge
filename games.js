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

  /* ================= GAME: MONEY QUIZ =================
     4 levels × 5 questions, each level harder than the last.
     answer = index of the correct option. Keep the right answer from
     always being the longest one, and vary its position. */
  const quizLevels = ["ROOKIE", "SAVER", "INVESTOR", "MONEY MASTER"];
  const quizQuestions = [
    // LEVEL 1 · ROOKIE
    { category: "Budgeting", question: "What is a budget mainly used for?",
      options: ["Guaranteeing you will never run out of money", "Planning income and expenses", "Automatically increasing how much you earn", "Avoiding having to make money decisions"], answer: 1,
      explanation: "A budget is a plan: it compares what comes in with what goes out so you can decide where your money goes." },
    { category: "Needs vs. wants", question: "Which of these is a need rather than a want?",
      options: ["The newest phone the day it comes out", "Concert tickets with your friends", "Groceries", "A second pair of designer sneakers"], answer: 2,
      explanation: "Needs are things you must have to live and work, like food, housing, and basic clothing. Wants are nice extras." },
    { category: "Saving", question: "An emergency fund is meant to cover…",
      options: ["unexpected expenses", "planned vacations and holiday gifts", "every investment opportunity that comes along", "regular entertainment like movies and games"], answer: 0,
      explanation: "An emergency fund is a cushion for surprises, like a car repair or a sudden medical bill, so you don't have to borrow." },
    { category: "Banking", question: "Why does a savings account pay you interest?",
      options: ["Because the government requires a bonus on every account", "It's a reward that only applies to your first deposit", "The bank charges you a fee for holding your money", "The bank pays to use your deposits"], answer: 3,
      explanation: "Banks lend out deposited money and earn interest on those loans. They share part of it with savers as interest." },
    { category: "Paychecks", question: "Your job pays $15 an hour and you work 10 hours. What is your pay before taxes?",
      options: ["$25", "$150", "$1,500", "$115"], answer: 1,
      explanation: "$15 × 10 hours = $150. That's your gross pay. Taxes and other deductions come out before you get your take-home pay." },

    // LEVEL 2 · SAVER
    { category: "Compound growth", question: "What is compound interest?",
      options: ["Interest earned on both your deposit and past interest", "Interest calculated only on the money you first deposited", "A fee your bank charges every time you make a deposit", "A guarantee that your savings will double every year"], answer: 0,
      explanation: "With compounding, interest earns interest. Over long periods, that snowball effect can make a big difference." },
    { category: "Rule of 72", question: "Money grows at 8% a year. About how long until it doubles?",
      options: ["About 4 years", "About 20 years", "About 9 years", "About 72 years"], answer: 2,
      explanation: "Divide 72 by the growth rate: 72 ÷ 8 = 9 years. It's a handy shortcut for estimating doubling time." },
    { category: "Opportunity cost", question: "You spend Saturday working a shift instead of going to a game. What's the opportunity cost?",
      options: ["The money you earned from the shift", "The game you gave up", "The cost of getting to work and back home", "There isn't one, since you got paid for your time"], answer: 1,
      explanation: "Opportunity cost is the next-best option you give up. Every choice has one, even a choice that earns money." },
    { category: "Inflation", question: "If prices rise 5% this year but your savings earn 1%, what happens?",
      options: ["Your money buys more than it did last year", "Nothing changes, because the 1% cancels out inflation", "Your money buys less than it did last year", "Your bank must make up the difference"], answer: 2,
      explanation: "When inflation outpaces what your savings earn, your purchasing power shrinks even though your balance grows." },
    { category: "The 50/30/20 rule", question: "In the 50/30/20 budget, what is the 20% for?",
      options: ["Fun money for wants like eating out and hobbies", "Savings and paying down debt", "Rent, groceries, and other needs", "Taxes taken out of your paycheck"], answer: 1,
      explanation: "50% goes to needs, 30% to wants, and 20% to savings and debt payoff. It's a starting point you can adjust." },

    // LEVEL 3 · INVESTOR
    { category: "Stocks", question: "When you buy a share of stock, what do you own?",
      options: ["A loan you made to the company that pays fixed interest", "A small piece of the company", "A guaranteed claim on next year's profits", "Insurance against the company losing money"], answer: 1,
      explanation: "A share is a slice of ownership. If the company grows, your share may be worth more. If it struggles, it can lose value." },
    { category: "Bonds", question: "What is a bond?",
      options: ["A loan to a company or government", "A share of ownership in a company that pays dividends", "A savings account with a higher interest rate", "A type of insurance for your investments"], answer: 0,
      explanation: "When you buy a bond, you lend money. The borrower promises to pay interest and return your money on a set date." },
    { category: "Diversification", question: "Which portfolio is the most diversified?",
      options: ["All your money in the one company you know best", "Five different tech companies", "Funds holding hundreds of companies across many industries", "Whatever stocks went up the most last month"], answer: 2,
      explanation: "Spreading money across many companies and industries reduces the damage any single one can do. It can't remove all risk." },
    { category: "Index funds", question: "What does an S&P 500 index fund do?",
      options: ["Holds the 500 large U.S. companies in the index", "Lets a manager pick only the 500 best-performing stocks", "Guarantees returns that match the market every year", "Invests in 500 small startups before they go public"], answer: 0,
      explanation: "An index fund simply tracks an index. You get broad exposure at low cost, but returns still go up and down with the market." },
    { category: "Risk and return", question: "An investment promises 'high returns with zero risk.' What should you think?",
      options: ["Great deal, invest as much as you can", "It's probably a red flag", "Only invest if your friends already have", "It's safe if the website looks professional"], answer: 1,
      explanation: "Higher potential returns come with higher risk. A promise of big, guaranteed returns is a classic warning sign of a scam." },

    // LEVEL 4 · MONEY MASTER
    { category: "Credit scores", question: "Which factor usually counts the most in a FICO credit score?",
      options: ["How many credit cards you own in total", "Payment history", "How much money you earn each year", "How long you've had a checking account"], answer: 1,
      explanation: "Paying bills on time is the biggest piece of a FICO score, about 35%. Your income isn't part of your credit score at all." },
    { category: "Credit cards", question: "You carry a $1,000 credit card balance at 24% APR for a year without paying. About how much interest builds up?",
      options: ["About $24", "About $2.40", "About $2,400", "About $240 or more"], answer: 3,
      explanation: "24% of $1,000 is $240, and because card interest compounds monthly, it ends up a bit more, roughly $268." },
    { category: "Real returns", question: "Your savings earn 5% while inflation is 3%. Roughly what's your real return?",
      options: ["About 2%", "About 8%", "About 15%", "About 5%, since inflation doesn't affect savings"], answer: 0,
      explanation: "Real return ≈ interest rate − inflation. 5% − 3% ≈ 2% growth in what your money can actually buy." },
    { category: "Loans", question: "Two car loans have the same monthly payment. What should you compare next?",
      options: ["Which dealership has the nicer showroom", "Nothing else, since the monthly payment is what matters", "Interest rate, fees, length, and total cost", "Which lender approves you the fastest"], answer: 2,
      explanation: "A lower payment can hide a longer loan and more total interest. Always compare the full cost of borrowing." },
    { category: "Compounding & time", question: "Ana invests $1,000 a year from age 20 to 30, then stops. Ben invests $1,000 a year from 30 to 60. With the same returns, who can end up with more at 60?",
      options: ["Ben, because he invested three times as much", "They always end up with exactly the same amount", "Neither, because investments never grow over that long", "Ana, because her money compounds for longer"], answer: 3,
      explanation: "At about 8% a year, Ana's early 10 years can grow to more than Ben's 30. Starting early gives compounding more time to work." }
  ];

  function buildQuiz(body) {
    const total = quizQuestions.length, perLevel = 5;
    body.innerHTML = `
      <div class="cabinet">
        <div class="marquee">MONEY QUIZ</div>
        <div class="screen">
          <div class="attract">
            <div>
              <h3>MONEY<br>QUIZ</h3>
              <p>${total} questions across 4 levels, from Rookie to Money Master. Every right answer drops a coin.</p>
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
            <div>
              <h3 class="r-head"></h3>
              <p class="r-text"></p>
              <div class="r-btns"><button class="btn q-continue" type="button">Next level ▶</button><button class="btn btn-ghost q-restart" type="button">Start over</button></div>
            </div>
          </div>
        </div>
        <div class="controls-deck" aria-hidden="true"><span class="joystick"></span><span class="coin-slot"></span><span class="arcade-btns"><i></i><i></i></span></div>
      </div>`;

    const screen = $(".screen", body), attract = $(".attract", body), play = $(".q-play", body), result = $(".result", body);
    const opts = $(".options", body), fb = $(".feedback", body), next = $(".q-next", body), bar = $(".progress", body);
    const btnContinue = $(".q-continue", body), btnRestart = $(".q-restart", body);
    let i = 0, correct = 0, levelCorrect = 0, locked = false;
    const readHi = () => Number(store.get("ngk-hiscore-20")) || 0;
    const showHi = () => { $(".hi", body).textContent = readHi() + " / " + total; };
    showHi();

    const setProgress = done => {
      const pct = Math.round(done / total * 100);
      $("i", bar).style.width = pct + "%";
      bar.setAttribute("aria-valuenow", String(pct));
    };

    function render() {
      const q = quizQuestions[i];
      const level = Math.floor(i / perLevel);
      locked = false;
      $(".q-step", body).textContent = "LV " + (level + 1) + " " + quizLevels[level] + " · Q" + (i % perLevel + 1) + "/" + perLevel;
      $(".q-coins", body).textContent = "COINS " + correct;
      $(".q-cat", body).textContent = q.category;
      $(".q-text", body).textContent = q.question;
      setProgress(i);
      fb.className = "feedback"; fb.textContent = "";
      next.disabled = true;
      next.textContent = (i + 1) % perLevel === 0 ? "Finish level →" : "Next →";
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
        correct++; levelCorrect++;
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

    function showScreen(head, text, canContinue) {
      play.hidden = true; result.hidden = false;
      $(".r-head", body).textContent = head;
      $(".r-text", body).textContent = text;
      btnContinue.hidden = !canContinue;
      (canContinue ? btnContinue : btnRestart).focus();
    }

    function start() {
      i = 0; correct = 0; levelCorrect = 0;
      attract.hidden = true; result.hidden = true; play.hidden = false;
      render();
    }

    next.addEventListener("click", () => {
      if (!locked) return;
      const level = Math.floor(i / perLevel);
      if (i === total - 1) {
        const best = Math.max(readHi(), correct);
        store.set("ngk-hiscore-20", String(best));
        showHi();
        showScreen(
          correct === total ? "PERFECT RUN!" : correct >= 15 ? "MONEY MASTER!" : correct >= 10 ? "NICE WORK!" : "GAME OVER",
          "You collected " + correct + " of " + total + " coins. " +
            (correct === total ? "Every level cleared without a miss." : "Read the explanations and try again to beat your score."),
          false);
      } else if ((i + 1) % perLevel === 0) {
        showScreen("LEVEL " + (level + 1) + " CLEAR!",
          levelCorrect + " of " + perLevel + " right. Next up: Level " + (level + 2) + ", " + quizLevels[level + 1] + ". It gets harder from here.", true);
      } else {
        i++; render();
      }
    });
    btnContinue.addEventListener("click", () => {
      i++; levelCorrect = 0;
      result.hidden = true; play.hidden = false;
      render();
    });
    $(".q-start", body).addEventListener("click", start);
    btnRestart.addEventListener("click", start);
  }

  /* ================= GAME: CONCEPT PRINTER ================= */
  const facts = [
    ["RULE OF 72", "Divide 72 by a yearly growth rate to estimate how long money takes to double. At 6%, about 12 years. At 9%, about 8."],
    ["THE $1,000 SNOWBALL", "$1,000 growing at 7% a year becomes about $7,600 in 30 years without you adding another cent. That's compounding."],
    ["BUFFETT STARTED AT 11", "Warren Buffett bought his first stock at age 11. Most of his fortune came after his 50s, because compounding needs time."],
    ["THE $5 HABIT", "$5 a day adds up to $1,825 a year. That isn't a reason to never buy coffee, but it's a reason to choose on purpose."],
    ["PIZZA FOR 10,000 BITCOIN", "In 2010, a programmer paid 10,000 bitcoin for two pizzas. Those coins were later worth more than $100 million."],
    ["MONEY ISN'T PAPER", "U.S. dollar bills are about 75% cotton and 25% linen. That's why they survive a trip through the washing machine."],
    ["THE $100,000 BILL", "The U.S. once printed a $100,000 bill. It was only used to move money between Federal Reserve Banks, never by the public."],
    ["100 TRILLION DOLLARS", "In 2008, Zimbabwe printed a 100-trillion-dollar note during extreme inflation. It still couldn't buy much. Inflation matters."],
    ["INFLATION'S DOUBLE", "At 3% inflation, prices roughly double in 24 years. Money stuffed in a mattress quietly loses half its buying power."],
    ["WALL STREET'S TREE", "In 1792, 24 brokers signed an agreement under a buttonwood tree on Wall Street. It grew into the New York Stock Exchange."],
    ["WHERE \"MONEY\" COMES FROM", "Ancient Romans minted coins at the temple of Juno Moneta. Her name gave us the words \"money\" and \"mint.\""],
    ["THE FIRST COINS", "Some of the first known coins were made around 600 BC in Lydia, in modern-day Turkey, from a gold and silver mix called electrum."],
    ["DINNER STARTED CREDIT CARDS", "The Diners Club card launched in 1950, reportedly after its founder forgot his wallet at a restaurant."],
    ["THE MINIMUM PAYMENT TRAP", "Paying only the minimum on a credit card can stretch a balance out for years and cost more in interest than the original purchase."],
    ["YOUR SCORE'S BIGGEST PIECE", "Payment history is about 35% of a FICO score. Paying on time, every time, does more for your credit than almost anything else."],
    ["THE GROSS VS. NET SURPRISE", "Your first paycheck will likely be smaller than you expect. Taxes and deductions come out before you see a dime."],
    ["$250,000 SAFETY NET", "FDIC insurance protects deposits up to $250,000 per depositor, per insured bank, per account type, even if the bank fails."],
    ["50 / 30 / 20", "A simple budget starting point: 50% needs, 30% wants, 20% saving and paying off debt. Adjust it to fit your life."],
    ["PAY YOURSELF FIRST", "Moving savings out the moment you get paid works better than saving whatever's left. Usually nothing is left."],
    ["OPPORTUNITY COST", "Every choice has a hidden price: the next-best thing you gave up. Spending $20 today means that $20 can't grow for tomorrow."]
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
    quiz: { title: "Money Quiz", file: "MONEY_QUIZ.EXE", icon: "gamepad", blurb: "20 questions, 4 levels", build: buildQuiz },
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
    <button type="button" class="dock-btn" aria-expanded="false" aria-controls="dockMenu" aria-label="Play money mini-games" title="Drag me anywhere">
      ${icon("gamepad")}<span>PLAY</span>
    </button>`;
  document.body.appendChild(dock);
  const dockBtn = $(".dock-btn", dock), dockMenu = $(".dock-menu", dock);

  // first visit only: point people at the games
  if (!store.get("ngk-dock-seen")) {
    const hint = el("div", "dock-hint", "Psst! Money mini-games in here.");
    hint.setAttribute("aria-hidden", "true");
    dock.appendChild(hint);
    const dismiss = () => { hint.remove(); store.set("ngk-dock-seen", "1"); };
    setTimeout(dismiss, 9000);
    dockBtn.addEventListener("click", dismiss, { once: true });
  }

  function closeDockMenu() { dockMenu.hidden = true; dockBtn.setAttribute("aria-expanded", "false"); }
  dockBtn.addEventListener("click", () => {
    const open = dockMenu.hidden;
    dockMenu.hidden = !open;
    dockBtn.setAttribute("aria-expanded", String(open));
    $(".dock-hint", dock)?.remove();
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
