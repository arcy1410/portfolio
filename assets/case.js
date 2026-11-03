/* Case-study interactions: each page's live demo, the sample-size calculator, PRD printing,
   filters, sorting and tabs. Loaded after site.js, which provides window.haptics. */
(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const H = window.haptics || { tick() {}, tap() {}, flip() {}, success() {}, warn() {} };
  const ease = "cubic-bezier(.2,.8,.2,1)";

  /* ---------- Curio: swipe the deck ---------- */
  d.querySelectorAll("[data-deck-app]").forEach(app => {
    const deck = app.querySelector(".deck");
    const cards = [...deck.querySelectorAll(".c-card")];
    const end = app.querySelector("[data-deck-end]");
    const pos = app.querySelector("[data-deck-pos]");
    const said = app.querySelector("[data-deck-kept]");
    const acts = app.querySelectorAll("[data-deck-act]");
    let i = 0;
    let kept = 0;

    function layout() {
      cards.forEach((c, k) => {
        const off = k - i;
        if (off < 0) { c.classList.add("is-gone"); c.inert = true; c.setAttribute("aria-hidden", "true"); return; }
        c.classList.remove("is-gone");
        c.style.zIndex = String(10 - off);
        c.style.transform = off === 0 ? "" : off === 1 ? "translateY(10px) scale(.955)" : "translateY(20px) scale(.91)";
        c.style.opacity = off > 1 ? "0" : "1";
        c.inert = off !== 0;
        c.setAttribute("aria-hidden", String(off !== 0));
      });
      const done = i >= cards.length;
      pos.textContent = String(Math.min(i + 1, cards.length));
      end.classList.toggle("is-on", done);
      end.inert = !done;
      end.setAttribute("aria-hidden", String(!done));
      acts.forEach(b => { b.disabled = done; });
    }

    function fling(dir) {
      const c = cards[i];
      if (!c) return;
      const x = dir === "keep" ? 1 : -1;
      const stamp = c.querySelector(dir === "keep" ? ".c-stamp.keep" : ".c-stamp.later");
      if (stamp) stamp.style.opacity = "1";
      c.style.transform = `translateX(${x * 135}%) rotate(${x * 16}deg)`;
      c.style.opacity = "0";
      if (dir === "keep") { kept += 1; H.success(); said.textContent = `Kept ${kept}. Saved cards come back for review.`; }
      else { H.tick(); said.textContent = "Later. Not a rejection, just not now."; }
      i += 1;
      layout();
      if (i >= cards.length) setTimeout(() => end.querySelector("a")?.focus({ preventScroll: true }), reduce.matches ? 0 : 420);
    }

    function reset() {
      i = 0; kept = 0;
      cards.forEach(c => {
        c.classList.remove("is-open");
        c.querySelectorAll(".c-stamp").forEach(s => { s.style.opacity = ""; });
        const b = c.querySelector(".c-reveal");
        if (b) { b.textContent = "Read the card"; b.setAttribute("aria-expanded", "false"); }
      });
      said.textContent = "Sample cards from Curio's seed set";
      layout();
      deck.focus({ preventScroll: true });
      H.tap();
    }

    acts.forEach(b => b.addEventListener("click", () => fling(b.dataset.deckAct)));
    app.querySelector("[data-deck-reset]")?.addEventListener("click", reset);
    deck.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); fling("keep"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); fling("later"); }
    });
    cards.forEach(c => {
      const b = c.querySelector(".c-reveal");
      b?.addEventListener("click", () => {
        const open = c.classList.toggle("is-open");
        b.textContent = open ? "Hide the card" : "Read the card";
        b.setAttribute("aria-expanded", String(open));
        H.flip();
      });
    });

    // Drag to swipe
    deck.addEventListener("pointerdown", e => {
      const c = cards[i];
      if (!c || !c.contains(e.target) || e.target.closest("button, a")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const x0 = e.clientX;
      const y0 = e.clientY;
      let dx = 0;
      let dragging = false;
      const sk = c.querySelector(".c-stamp.keep");
      const sl = c.querySelector(".c-stamp.later");
      const move = ev => {
        dx = ev.clientX - x0;
        const dy = ev.clientY - y0;
        if (!dragging) {
          if (Math.abs(dx) < 6) return;
          if (Math.abs(dy) > Math.abs(dx)) { stop(); return; }
          dragging = true;
          c.classList.add("is-drag");
        }
        c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
        sk.style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
        sl.style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
      };
      const stop = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", stop);
        removeEventListener("pointercancel", stop);
        c.classList.remove("is-drag");
        if (dragging && Math.abs(dx) > 90) { fling(dx > 0 ? "keep" : "later"); return; }
        sk.style.opacity = ""; sl.style.opacity = "";
        if (dragging) c.style.transform = "";
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", stop);
      addEventListener("pointercancel", stop);
    });
    layout();
  });

  /* ---------- Fold: let a bank go quiet ---------- */
  d.querySelectorAll("[data-sim]").forEach(sim => {
    const range = sim.querySelector("[data-sim-range]");
    const out = sim.querySelector("[data-sim-out]");
    const st = sim.querySelector("[data-sim-st]");
    const asof = sim.querySelector("[data-sim-asof]");
    const banner = sim.querySelector("[data-sim-banner]");
    const last = sim.querySelector("[data-sim-last]");
    const push = sim.querySelector("[data-sim-push]");
    const pushT = sim.querySelector("[data-sim-push-title]");
    const modes = sim.querySelectorAll("[data-sim-mode]");
    const today = new Date(2026, 9, 31);
    const fmt = n => { const x = new Date(today); x.setDate(x.getDate() - n); return `${x.getDate()} ${x.toLocaleString("en-GB", { month: "short" })}`; };
    let lastAlert = -1;
    let timer;

    function showPush() {
      push.classList.add("is-on");
      clearTimeout(timer);
      timer = setTimeout(() => push.classList.remove("is-on"), 2600);
      H.warn();
    }
    function render(fromUser) {
      const n = Number(range.value);
      const fix = sim.dataset.mode === "fix";
      const stale = n >= 3;
      sim.dataset.stale = String(stale);
      out.textContent = n === 1 ? "1 day" : `${n} days`;
      const date = fmt(n);
      st.classList.toggle("is-stale", n >= 1);
      if (n === 0) st.textContent = "Refreshed today";
      else if (fix && stale) st.textContent = `Not updated in ${n} days`;
      else if (fix) st.textContent = n === 1 ? "Refreshed yesterday" : `Refreshed ${n} days ago`;
      else st.textContent = "Refresh failed";
      asof.textContent = `Includes data from ${date}`;
      banner.textContent = `SBI hasn't updated in ${n} days`;
      last.textContent = date;
      pushT.textContent = `SBI hasn't updated since ${date}`;
      const alertDay = n >= 7 ? 7 : n >= 3 ? 3 : -1;
      if (fix && fromUser && alertDay > 0 && alertDay !== lastAlert) showPush();
      if (!stale) push.classList.remove("is-on");
      lastAlert = alertDay;
    }
    range.addEventListener("input", () => render(true));
    modes.forEach(b => b.addEventListener("click", () => {
      sim.dataset.mode = b.dataset.simMode;
      modes.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      H.tap();
      lastAlert = -1;
      render(true);
    }));
    render(false);
  });

  /* ---------- Sample size: two-proportion test, 95% confidence, 80% power ---------- */
  d.querySelectorAll("[data-calc]").forEach(calc => {
    const base = calc.querySelector("[data-calc-base]");
    const lift = calc.querySelector("[data-calc-lift]");
    const bo = calc.querySelector("[data-calc-base-out]");
    const lo = calc.querySelector("[data-calc-lift-out]");
    const nEl = calc.querySelector("[data-calc-n]");
    const say = calc.querySelector("[data-calc-say]");
    const formula = calc.querySelector("[data-calc-formula]");
    const pct = p => `${Math.round(p * 100)}%`;
    function run() {
      const p1 = Number(base.value) / 100;
      const p2 = Math.min(0.95, p1 + Number(lift.value) / 100);
      const n = Math.ceil(Math.pow(1.96 + 0.84, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / Math.pow(p2 - p1, 2) - 1e-9);
      const about = Math.ceil(n / 10) * 10;
      bo.textContent = pct(p1);
      lo.textContent = `${Math.round((p2 - p1) * 100)} points`;
      nEl.textContent = n.toLocaleString("en-IN");
      say.innerHTML = `To spot a lift from ${pct(p1)} to ${pct(p2)}, I'd need <span class="hl is-in">about ${about.toLocaleString("en-IN")} users with a stale account per group</span>.`;
      formula.textContent = `n = (1.96 + 0.84)² × [${p1.toFixed(2)}×${(1 - p1).toFixed(2)} + ${p2.toFixed(2)}×${(1 - p2).toFixed(2)}] ÷ ${(p2 - p1).toFixed(2)}² ≈ ${n}`;
    }
    [base, lift].forEach(r => {
      r.addEventListener("input", run);
      r.addEventListener("change", () => H.tick());
    });
    run();
  });

  /* ---------- Print just the PRD ---------- */
  d.querySelectorAll("[data-print-prd]").forEach(b => b.addEventListener("click", () => {
    H.tap();
    root.classList.add("print-prd");
    const done = () => { root.classList.remove("print-prd"); removeEventListener("afterprint", done); };
    addEventListener("afterprint", done);
    print();
    setTimeout(done, 1000);
  }));

  /* ---------- Prioritization: filter the board and the table ---------- */
  d.querySelectorAll("[data-board]").forEach(board => {
    const chips = board.querySelectorAll(".chip-btn[data-quad]");
    const marks = d.querySelectorAll(".pick[data-quad]");
    const rows = d.querySelectorAll("tr[data-quad]");
    chips.forEach(ch => ch.addEventListener("click", () => {
      const q = ch.dataset.quad;
      chips.forEach(x => x.setAttribute("aria-pressed", String(x === ch)));
      marks.forEach(m => m.classList.toggle("is-dim", q !== "all" && m.dataset.quad !== q));
      rows.forEach(r => r.classList.toggle("is-dim", q !== "all" && r.dataset.quad !== q));
      H.tap();
    }));
  });

  /* ---------- Sortable tables, rows glide to their new place ---------- */
  d.querySelectorAll("table[data-sortable]").forEach(t => {
    const tbody = t.tBodies[0];
    const original = [...tbody.rows];
    t.querySelectorAll("[data-sort]").forEach(btn => btn.addEventListener("click", () => {
      const th = btn.closest("th");
      const key = btn.dataset.sort;
      const cur = th.getAttribute("aria-sort");
      const next = cur === "descending" ? "ascending" : cur === "ascending" ? "none" : "descending";
      t.querySelectorAll("th[aria-sort]").forEach(x => x.setAttribute("aria-sort", "none"));
      th.setAttribute("aria-sort", next);
      const sorted = next === "none" ? original : [...original].sort((a, b) =>
        (next === "descending" ? -1 : 1) * (Number(a.dataset[key]) - Number(b.dataset[key])));
      const before = new Map(original.map(r => [r, r.getBoundingClientRect().top]));
      sorted.forEach(r => tbody.appendChild(r));
      if (!reduce.matches) sorted.forEach(r => {
        const dy = before.get(r) - r.getBoundingClientRect().top;
        if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 420, easing: ease });
      });
      H.tap();
    }));
  });

  /* ---------- Tabs ---------- */
  d.querySelectorAll("[data-tabs]").forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    function select(tab, focus) {
      tabs.forEach(x => {
        const on = x === tab;
        x.setAttribute("aria-selected", String(on));
        x.tabIndex = on ? 0 : -1;
        d.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
      H.tap();
      const panel = d.getElementById(tab.getAttribute("aria-controls"));
      if (!reduce.matches) panel.querySelectorAll(".app-col").forEach((col, k) =>
        col.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
          { duration: 420, delay: k * 70, easing: ease, fill: "backwards" }));
    }
    tabs.forEach((tab, k) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        select(tabs[(k + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- Amazon: today's page against the redesign ---------- */
  d.querySelectorAll("[data-ro]").forEach(ro => {
    const list = ro.querySelector(".ro-list");
    const items = [...list.children];
    const byId = new Map(items.map(li => [li.dataset.id, li]));
    const today = items.map(li => li.dataset.id);
    const redesign = ro.dataset.order.split(",");
    const sum = ro.querySelector("[data-ro-sum]");
    const btns = ro.querySelectorAll("[data-ro-view]");
    const text = {
      today: "<b>Today:</b> Buy Now is block 12, on screen 3. The reviews that decide the purchase are blocks 23 and 24, on screen 11.",
      redesign: "<b>My redesign:</b> Buy Now and what buyers say both sit on screen 1. The countdown goes, four offers sit behind one tap, and all seven sponsored blocks stay, below the reviews."
    };
    function show(view) {
      const before = new Map(items.map(li => [li, li.getBoundingClientRect().top]));
      const wasOut = new Set(items.filter(li => li.classList.contains("is-out")));
      const ids = view === "today" ? today : redesign;
      items.forEach(li => {
        li.classList.add("is-out");
        li.classList.remove("s1");
        li.removeAttribute("data-mark");
        li.textContent = li.dataset.label;
      });
      ids.forEach((id, k) => {
        const li = byId.get(id);
        li.classList.remove("is-out");
        list.appendChild(li);
        if (view === "redesign") {
          li.dataset.n = String(k + 1);
          if (li.dataset.alt) li.textContent = li.dataset.alt;
          if (k < 8) li.classList.add("s1");
        } else {
          li.dataset.n = id;
        }
      });
      if (view === "today") { byId.get("12").dataset.mark = "Screen 3"; byId.get("23").dataset.mark = "Screen 11"; }
      else { byId.get("2").dataset.mark = "Screen 1"; }
      ro.dataset.view = view;
      sum.innerHTML = text[view];
      if (!reduce.matches) items.forEach(li => {
        if (li.classList.contains("is-out")) return;
        if (wasOut.has(li)) { li.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: ease }); return; }
        const dy = before.get(li) - li.getBoundingClientRect().top;
        if (dy) li.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 650, easing: ease });
      });
    }
    btns.forEach(b => b.addEventListener("click", () => {
      if (ro.dataset.view === b.dataset.roView) return;
      btns.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      show(b.dataset.roView);
      H.flip();
    }));
    show("today");
  });

  /* ---------- Kite: replay the sign-up ---------- */
  d.querySelectorAll("[data-jp]").forEach(jp => {
    const dataEl = jp.querySelector("#kite-journey");
    if (!dataEl) return;
    const data = JSON.parse(dataEl.textContent);
    const q = s => jp.querySelector(s);
    const range = q("[data-jp-range]");
    const play = q("[data-jp-play]");
    const lanes = jp.querySelectorAll(".lane");
    const segs = jp.querySelectorAll(".steps5 i");
    const names = { app: "the Kite app", signup: "the sign-up site", esign: "the e-sign site", web: "Kite on the web" };
    const playIcon = play.innerHTML;
    const pauseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M8.5 5.5v13M15.5 5.5v13"/></svg>';
    let timer = null;
    const handoffs = k => { let h = 0; for (let j = 1; j <= k; j++) if (data[j][3] !== data[j - 1][3]) h++; return h; };

    function render(k, fromUser) {
      const [tm, name, stepText, lane] = data[k];
      q("[data-jp-n]").textContent = `Screen ${k + 1}`;
      q("[data-jp-time]").textContent = tm;
      q("[data-jp-screen]").textContent = name;
      lanes.forEach(l => l.classList.toggle("is-on", l.dataset.lane === lane));
      const m = /Step (\d) of 5/.exec(stepText);
      const filled = m ? Number(m[1]) : k > 10 ? 5 : 0;
      segs.forEach((s, j) => s.classList.toggle("on", j < filled));
      q("[data-jp-step]").textContent = m ? `Step ${m[1]} of 5` : k > 10 ? "Done, it says" : "Not counted yet";
      q("[data-jp-real]").textContent = `${k + 1} of 19 screens`;
      q("[data-jp-bar]").style.setProperty("--w", `${((k + 1) / 19) * 100}%`);
      const changed = k > 0 && data[k][3] !== data[k - 1][3];
      let note;
      if (k === 10) note = "<b>&ldquo;One last step!&rdquo;</b> The counter is full, but this is screen 11 of 19.";
      else if (changed) note = `<b>Hand-off ${handoffs(k)} of 5:</b> from ${names[data[k - 1][3]]} to ${names[lane]}.`;
      else if (k > 10) note = `${k - 10} screen${k - 10 === 1 ? "" : "s"} after &ldquo;One last step!&rdquo;`;
      else if (k === 18) note = "Done: the first watchlist.";
      else note = "Press play, or drag through all 19 screens.";
      if (k === 18) note = "<b>Done at 11:35:</b> 19 screens, 5 hand-offs, 8 of them after the last step.";
      q("[data-jp-note]").innerHTML = note;
      range.value = String(k + 1);
      if (fromUser) { if (changed) H.warn(); else H.tick(); }
    }
    function stop() {
      clearInterval(timer); timer = null;
      play.innerHTML = playIcon;
      play.setAttribute("aria-label", "Play the sign-up");
    }
    play.addEventListener("click", () => {
      if (timer) { stop(); return; }
      let k = Number(range.value) - 1;
      if (k >= data.length - 1) k = -1;
      play.innerHTML = pauseIcon;
      play.setAttribute("aria-label", "Pause");
      H.tap();
      const step = () => {
        k += 1;
        render(k, true);
        if (k >= data.length - 1) stop();
      };
      step();
      timer = setInterval(step, 950);
    });
    range.addEventListener("input", () => { stop(); render(Number(range.value) - 1, true); });
    render(0, false);
  });

  /* ---------- Tagger: stamp the statement lines ---------- */
  d.querySelectorAll("[data-slip]").forEach(slip => {
    const rows = [...slip.querySelectorAll(".slip-row")];
    const timers = [];
    function run(fromUser) {
      timers.splice(0).forEach(clearTimeout);
      slip.querySelectorAll(".stamp, .slip-why").forEach(s => s.classList.remove("is-on"));
      if (reduce.matches) { slip.querySelectorAll(".stamp, .slip-why").forEach(s => s.classList.add("is-on")); return; }
      let t = 150;
      rows.forEach(r => {
        const [a, b] = r.querySelectorAll(".stamp");
        const why = r.querySelector(".slip-why");
        timers.push(setTimeout(() => { a.classList.add("is-on"); if (fromUser) H.tick(); }, (t += 420)));
        timers.push(setTimeout(() => { b.classList.add("is-on"); why.classList.add("is-on"); if (fromUser) H.tap(); }, (t += 620)));
      });
    }
    slip.querySelector("[data-slip-run]")?.addEventListener("click", () => run(true));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); run(false); } }, { threshold: 0.4 });
      io.observe(slip);
    } else run(false);
  });
  /* ---------- Furrio: follow an order ---------- */
  d.querySelectorAll("[data-fo]").forEach(fo => {
    const q = s => fo.querySelector(s);
    const CH = {
      prepaid: { shop: "Furrio's own store", pay: "Razorpay: UPI, card or net banking", stock: "Shopify takes it off stock", ship: "Shiprocket courier, tracked", web: true, cod: false },
      cod: { shop: "Furrio's own store", pay: "Cash at the door, via the COD form", stock: "Shopify takes it off stock", ship: "Shiprocket courier, cash collected", web: true, cod: true },
      amazon: { shop: "Furrio's Amazon listing", pay: "Paid on Amazon", stock: "Logged in the stock tracker", ship: "Amazon's delivery flow", web: false, name: "Amazon" },
      flipkart: { shop: "Furrio's Flipkart listing", pay: "Paid on Flipkart", stock: "Logged in the stock tracker", ship: "Flipkart's delivery flow", web: false, name: "Flipkart" },
    };
    const inr = n => "₹" + n.toLocaleString("en-IN");
    const range = q("[data-fo-range]");
    const btns = fo.querySelectorAll("[data-ch]");
    let ch = "prepaid";
    function render(changed) {
      const c = CH[ch];
      for (const k of ["shop", "pay", "stock", "ship"]) {
        const el = q(`[data-fo-${k}]`);
        if (el.textContent !== c[k]) { el.textContent = c[k]; if (changed && !reduce.matches) { el.classList.remove("is-new"); void el.offsetWidth; el.classList.add("is-new"); } }
      }
      q("[data-fo-web]").hidden = !c.web;
      q("[data-fo-mkt]").hidden = c.web;
      if (!c.web) { q("[data-fo-mkt]").innerHTML = `<b>${c.name}</b> sets the price, takes the payment and runs delivery. The sale is logged in Furrio's stock tracker under ${c.name}, so the monthly view shows every channel side by side.`; return; }
      const v = Number(range.value);
      const ship = v >= 499 ? 0 : 49;
      const fee = c.cod ? 50 : 0;
      q("[data-fo-cart]").textContent = inr(v);
      q("[data-fo-items]").textContent = inr(v);
      q("[data-fo-shipping]").textContent = ship ? inr(ship) : "Free";
      q("[data-fo-codrow]").hidden = !c.cod;
      q("[data-fo-total]").textContent = inr(v + ship + fee);
      q("[data-fo-note]").textContent = ship ? `Add ${inr(499 - v)} more for free shipping.` : c.cod ? "Free shipping from ₹499. The ₹50 fee covers collecting cash." : "Free shipping from ₹499, and no COD fee when paying online.";
    }
    btns.forEach(b => b.addEventListener("click", () => {
      ch = b.dataset.ch;
      btns.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      H.tap();
      render(true);
    }));
    let last = Number(range.value) >= 499;
    range.addEventListener("input", () => { const now = Number(range.value) >= 499; if (now !== last) { H.success(); last = now; } else H.tick(); render(false); });
    render(false);
  });
})();
