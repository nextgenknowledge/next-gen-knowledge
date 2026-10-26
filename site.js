/* NextGen Knowledge — shared behaviour: nav, ticker, reveals, counters */

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* MOBILE NAVIGATION */
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  if (menuToggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => { if (window.innerWidth > 960) closeMenu(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  }

  /* MARK CURRENT PAGE IN NAV */
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(link => {
    if (link.getAttribute("href") === page) link.setAttribute("aria-current", "page");
  });

  /* MONEY TICKER — duplicate the items so the loop is seamless */
  document.querySelectorAll(".ticker-track").forEach(track => {
    const clone = track.innerHTML;
    track.insertAdjacentHTML("beforeend", clone);
    [...track.children].slice(track.children.length / 2).forEach(el => el.setAttribute("aria-hidden", "true"));
  });

  /* COUNT-UP NUMBERS: <span data-count="350" data-suffix="+"> */
  function countUp(el) {
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const decimals = Number(el.dataset.decimals || 0);
    const format = v => prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

    if (reduceMotion) { el.textContent = format(target); return; }

    const start = performance.now();
    const duration = 1100;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(decimals ? target * eased : Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* SCROLL REVEALS */
  const observed = document.querySelectorAll(".reveal, [data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    document.documentElement.classList.add("reveal-ready");
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        if (entry.target.dataset.count) countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: .18 });
    observed.forEach(el => io.observe(el));
  } else {
    observed.forEach(el => {
      el.classList.add("in");
      if (el.dataset.count) countUp(el);
    });
  }

  /* FOOTER YEAR */
  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();
})();

/* TABS: <div role="tablist"> with [role=tab][aria-controls] */
document.querySelectorAll('[role="tablist"]').forEach(list => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", e => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
});

/* POP-UPS THAT OPEN ON THEIR OWN: <dialog data-autoshow> shows once per visit */
document.querySelectorAll("dialog[data-autoshow]").forEach(dlg => {
  const key = "ngk-seen-" + dlg.id;
  let seen = false;
  try { seen = sessionStorage.getItem(key) === "1"; } catch (e) {}
  if (seen) return;
  setTimeout(() => {
    if (document.querySelector("dialog[open]")) return;
    dlg.showModal();
    try { sessionStorage.setItem(key, "1"); } catch (e) {}
  }, 900);
});

/* any [data-close] button closes the dialog it sits in */
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-close]");
  if (btn) btn.closest("dialog")?.close();
});
