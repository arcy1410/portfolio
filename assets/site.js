/* Interactions: haptics, theme, header, menu, evidence notes, highlighter reveals,
   counters, chart details, table of contents, copy email. No dependencies. */
(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- Haptics ----------
     Android: the Vibration API. iOS 18+ Safari has no Vibration API, but toggling a native
     switch control gives a light system haptic, so a hidden switch is clicked instead. */
  const haptics = (() => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const canVibrate = coarse && typeof navigator.vibrate === "function";
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const supported = canVibrate || (isIOS && coarse);
    let on = store.get("haptics") !== "off";
    function iosTick() {
      const label = d.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.display = "none";
      const input = d.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      label.appendChild(input);
      d.head.appendChild(label);
      label.click();
      label.remove();
    }
    function fire(pattern) {
      if (!on || !supported) return;
      try { if (canVibrate) navigator.vibrate(pattern); else iosTick(); } catch (e) { /* ignore */ }
    }
    return {
      supported,
      get on() { return on; },
      set(v) { on = v; store.set("haptics", v ? "on" : "off"); },
      tick() { fire(6); },
      tap() { fire(10); },
      flip() { fire([8, 30, 8]); },
      success() { fire([12, 60, 18]); },
      warn() { fire([24, 50, 24]); }
    };
  })();
  window.haptics = haptics;

  const hapticsBtn = d.querySelector("[data-haptics-toggle]");
  if (hapticsBtn && haptics.supported) {
    hapticsBtn.hidden = false;
    const sync = () => {
      hapticsBtn.setAttribute("aria-pressed", String(haptics.on));
      hapticsBtn.setAttribute("aria-label", haptics.on ? "Turn haptics off" : "Turn haptics on");
    };
    sync();
    hapticsBtn.addEventListener("click", () => {
      haptics.set(!haptics.on);
      if (haptics.on) haptics.success();
      sync();
      toast(haptics.on ? "Haptics on" : "Haptics off");
    });
  }

  /* ---------- Toast ---------- */
  function toast(msg, ok = true) {
    let t = d.querySelector(".toast");
    if (!t) {
      t = d.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      d.body.appendChild(t);
    }
    t.innerHTML = (ok ? "<b aria-hidden=\"true\">✓</b>" : "") + msg;
    t.classList.add("is-on");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("is-on"), 2200);
  }

  /* ---------- Theme: circular reveal from the button ---------- */
  const themeBtn = d.querySelector("[data-theme-toggle]");
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.getAttribute("data-theme") || (darkQuery.matches ? "dark" : "light");
  function syncTheme() {
    if (!themeBtn) return;
    const dark = currentTheme() === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    const meta = d.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0C1240" : "#FFFFFF");
  }
  syncTheme();
  darkQuery.addEventListener("change", syncTheme);
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      haptics.tap();
      const next = currentTheme() === "dark" ? "light" : "dark";
      const apply = () => { root.setAttribute("data-theme", next); store.set("theme", next); syncTheme(); };
      if (!d.startViewTransition || reduce.matches) { apply(); return; }
      const r = themeBtn.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add("theme-vt");
      const vt = d.startViewTransition(apply);
      vt.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(() => {});
      vt.finished.finally(() => root.classList.remove("theme-vt"));
    });
  }

  /* ---------- Header: hides while reading down, returns on scroll up; reading progress ---------- */
  const head = d.querySelector(".site-head");
  const progress = d.querySelector(".progress");
  let lastY = scrollY;
  let ticking = false;
  function onScroll() {
    const y = scrollY;
    if (head) {
      head.classList.toggle("is-scrolled", y > 8);
      const menuOpen = d.querySelector(".menu[open]");
      if (!menuOpen && y > lastY + 6 && y > 260 && !head.contains(d.activeElement)) head.classList.add("is-hidden");
      else if (y < lastY - 6 || y < 260) head.classList.remove("is-hidden");
    }
    if (progress) {
      const h = root.scrollHeight - innerHeight;
      progress.style.setProperty("--p", h > 0 ? Math.min(1, Math.max(0, y / h)).toFixed(4) : 0);
    }
    lastY = y;
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  d.addEventListener("focusin", e => { if (head && head.contains(e.target)) head.classList.remove("is-hidden"); });

  /* ---------- Mobile menu ---------- */
  const menu = d.querySelector(".menu");
  const menuBtn = d.querySelector(".menu-btn");
  if (menu && menuBtn && typeof menu.showModal === "function") {
    menuBtn.addEventListener("click", () => {
      haptics.tap();
      menu.showModal();
      menuBtn.setAttribute("aria-expanded", "true");
    });
    menu.querySelector("[data-close]")?.addEventListener("click", () => { haptics.tick(); menu.close(); });
    menu.addEventListener("close", () => { menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus({ preventScroll: true }); });
    menu.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (a && a.hash && a.pathname === location.pathname) menu.close();
    });
  } else if (menuBtn) {
    menuBtn.hidden = true;
  }

  /* ---------- Evidence notes: tap to flip from the evidence to the fix ---------- */
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  d.querySelectorAll(".note").forEach(note => {
    const front = note.querySelector(".note-front");
    const back = note.querySelector(".note-back");
    if (!front || !back) return;
    back.inert = true;
    back.setAttribute("aria-hidden", "true");
    const flip = (toBack, viaKeyboard) => {
      note.classList.add("is-flipping");
      note.classList.toggle("is-flipped", toBack);
      front.inert = toBack;
      back.inert = !toBack;
      front.setAttribute("aria-hidden", String(toBack));
      back.setAttribute("aria-hidden", String(!toBack));
      note.querySelectorAll(".note-flip").forEach(b => b.setAttribute("aria-expanded", String(toBack)));
      haptics.flip();
      if (viaKeyboard) {
        const target = toBack ? back.querySelector("a, button") : front.querySelector("button");
        setTimeout(() => target && target.focus({ preventScroll: true }), reduce.matches ? 0 : 280);
      }
      clearTimeout(note._t);
      note._t = setTimeout(() => note.classList.remove("is-flipping"), 750);
    };
    note.addEventListener("click", e => {
      if (e.target.closest("a")) { haptics.tap(); return; }
      const viaKeyboard = e.detail === 0 && !!e.target.closest("button");
      flip(!note.classList.contains("is-flipped"), viaKeyboard);
    });
    if (fine && !reduce.matches) {
      note.addEventListener("pointermove", e => {
        const r = note.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        note.style.setProperty("--ty", (px * 12).toFixed(2) + "deg");
        note.style.setProperty("--tx", (-py * 12).toFixed(2) + "deg");
      });
      note.addEventListener("pointerleave", () => {
        note.style.setProperty("--tx", "0deg");
        note.style.setProperty("--ty", "0deg");
      });
    }
  });

  // A soft tick as each note snaps into place on a phone
  const notesRow = d.querySelector(".notes");
  if (notesRow && haptics.supported) {
    let touched = false;
    let timer;
    let lastIndex = -1;
    const settle = () => {
      if (!touched) return;
      const w = notesRow.firstElementChild ? notesRow.firstElementChild.getBoundingClientRect().width : 1;
      const i = Math.round(notesRow.scrollLeft / Math.max(1, w));
      if (i !== lastIndex) { lastIndex = i; haptics.tick(); }
    };
    notesRow.addEventListener("pointerdown", () => { touched = true; }, { passive: true });
    if ("onscrollend" in window) notesRow.addEventListener("scrollend", settle);
    else notesRow.addEventListener("scroll", () => { clearTimeout(timer); timer = setTimeout(settle, 140); }, { passive: true });
  }

  /* ---------- Reveal: highlighter lines, counters, the Fold sequence ---------- */
  function countUp(el) {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to)) return;
    if (reduce.matches) { el.textContent = String(to); return; }
    const dur = 1000;
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const revealables = d.querySelectorAll(".hl, [data-count], .seq");
  if (reduce.matches || !("IntersectionObserver" in window)) {
    revealables.forEach(el => el.classList.add("is-in"));
  } else {
    d.querySelectorAll("[data-count]").forEach(el => { el.textContent = "0"; });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        if (en.target.dataset.count) countUp(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    revealables.forEach(el => io.observe(el));
  }

  /* ---------- Charts: tap a mark to read the evidence behind it ---------- */
  d.querySelectorAll("[data-pickable]").forEach(fig => {
    const out = fig.querySelector(".detail");
    const picks = fig.querySelectorAll(".pick");
    const choose = p => {
      picks.forEach(x => {
        x.classList.toggle("is-picked", x === p);
        x.setAttribute("aria-pressed", String(x === p));
      });
      if (out) out.textContent = p.dataset.detail;
      haptics.tap();
    };
    picks.forEach(p => {
      p.addEventListener("click", () => choose(p));
      p.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(p); }
      });
    });
  });

  /* ---------- Table of contents: highlight the section being read ---------- */
  const toc = d.querySelector(".toc");
  if (toc) {
    const links = [...toc.querySelectorAll("a")];
    const heads = links.map(a => d.getElementById(decodeURIComponent(a.hash.slice(1))));
    let raf = 0;
    const spy = () => {
      raf = 0;
      const line = innerHeight * 0.3;
      let idx = 0;
      heads.forEach((h, i) => { if (h && h.getBoundingClientRect().top <= line) idx = i; });
      links.forEach((a, i) => a.classList.toggle("is-active", i === idx));
    };
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(spy); }, { passive: true });
    addEventListener("resize", spy);
    spy();
  }

  /* ---------- Copy email ---------- */
  d.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy");
      try {
        await navigator.clipboard.writeText(text);
        haptics.success();
        toast(btn.getAttribute("data-copied") || "Copied");
      } catch (e) {
        haptics.warn();
        toast("Couldn't copy. It's " + text, false);
      }
    });
  });

  /* ---------- Page transitions: only the tapped project title travels to the next page ---------- */
  d.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.hash) return;
    const slug = url.pathname.replace(/^\//, "").replace(/\.html$/, "");
    const el = a.querySelector("[data-vt]") || d.querySelector(`[data-vt="${slug}"]`);
    if (!el || el.dataset.vt !== slug) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    d.querySelectorAll("[data-vt]").forEach(x => { x.style.viewTransitionName = ""; });
    el.style.viewTransitionName = "t-" + slug;
  }, true);
  // The headline this page landed on shouldn't linger as a ghost when leaving
  addEventListener("pageswap", () => {
    d.querySelectorAll(".vt-landing").forEach(h => {
      if (!h.dataset.vtName) h.dataset.vtName = h.style.viewTransitionName;
      h.style.viewTransitionName = "none";
    });
  });
  addEventListener("pageshow", () => {
    d.querySelectorAll(".vt-landing").forEach(h => { if (h.dataset.vtName) h.style.viewTransitionName = h.dataset.vtName; });
  });

  /* ---------- A light tick on links and buttons that don't have their own ---------- */
  d.addEventListener("click", e => {
    const el = e.target.closest("a[href], .btn, .seq a, .index a");
    if (!el || el.closest(".note, [data-copy], [data-theme-toggle], [data-haptics-toggle], .menu-btn, [data-close], .tg-actions, .tg-confirm, .rule-item, .pick")) return;
    haptics.tick();
  });
})();
