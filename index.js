// Servisofts × Sofía — interacciones compartidas

(() => {
  const nav = document.querySelector(".nav");

  // Sombra del nav al hacer scroll
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Menú móvil
  const toggle = document.querySelector(".nav__toggle");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });

  // Desplegable de cotizaciones
  document.querySelectorAll(".has-menu").forEach((item) => {
    const btn = item.querySelector("button");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open);
    });
  });
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".has-menu.is-open").forEach((item) => {
      if (!item.contains(e.target)) {
        item.classList.remove("is-open");
        item.querySelector("button").setAttribute("aria-expanded", false);
      }
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".has-menu.is-open").forEach((i) => i.classList.remove("is-open"));
  });

  // Cerrar menú móvil al navegar a un ancla
  document.querySelectorAll('.nav__links a[href^="#"]').forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("is-open"))
  );

  // Animación de entrada
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  // Pestañas ([data-tabs])
  document.querySelectorAll("[data-tabs]").forEach((box) => {
    const tabs = box.querySelectorAll("[data-tab]");
    tabs.forEach((btn) =>
      btn.addEventListener("click", () => {
        tabs.forEach((b) => {
          const on = b === btn;
          b.setAttribute("aria-selected", on);
          document.getElementById(b.dataset.tab).hidden = !on;
        });
      })
    );
  });

  // Año en el footer
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // ---------- Calculadora de costo mensual de operación ([data-opex]) ----------
  const opex = document.querySelector("[data-opex]");
  if (opex) {
    const RATE = { svc: 0.0113, util: 0.0113, mkt: 0.074, freeSvc: 1000, min: 0.08, stt: 0.003 };
    // OpenAI GPT-4o mini, US$ por millón de tokens: entrada, entrada en caché, salida
    const AI = { in: 0.15, cached: 0.075, out: 0.6 };
    // Tokens estimados por respuesta del bot: instrucciones + catálogo (caché), conversación, respuesta
    const TOK = { cached: 3000, input: 1200, output: 200 };
    const PLANS = [
      { name: "Pro", fee: 99, mins: 1238 },
      { name: "Scale", fee: 299, mins: 3738 },
      { name: "Business", fee: 990, mins: 12375 },
    ];
    const num = (k) => Math.max(0, parseFloat(opex.querySelector(`[data-in="${k}"]`).value) || 0);
    const set = (k, v) => opex.querySelectorAll(`[data-o="${k}"]`).forEach((el) => (el.textContent = v));
    const int = (n) => Math.round(n).toLocaleString("es-BO");

    const calc = () => {
      const fx = num("fx") || 12.05;
      const bs = (usd) => `Bs. ${(usd * fx).toLocaleString("es-BO", { maximumFractionDigits: 0 })}`;

      const orders = num("waOrders");
      const svcN = orders * num("waMsgs");
      const svcPaid = Math.max(0, svcN - RATE.freeSvc);
      const utilN = orders * num("waUtil");
      const mktN = num("waMkt");
      const perReply = (TOK.input * AI.in + TOK.cached * AI.cached + TOK.output * AI.out) / 1e6;
      const notes = num("voiceNotes");
      const wa = { svc: svcPaid * RATE.svc, util: utilN * RATE.util, mkt: mktN * RATE.mkt, ai: svcN * perReply, stt: notes * 0.5 * RATE.stt };
      const waTot = wa.svc + wa.util + wa.mkt + wa.ai + wa.stt;

      const mins = num("calls") * num("callMin");
      const best = PLANS.map((p) => ({ ...p, extra: Math.max(0, mins - p.mins) }))
        .map((p) => ({ ...p, cost: p.fee + p.extra * RATE.min }))
        .sort((a, b) => a.cost - b.cost)[0];
      const voiceTot = mins ? best.cost : 0;

      set("waSvcN", `${int(svcN)} mensajes · ${int(Math.min(svcN, RATE.freeSvc))} gratis`);
      set("waSvc", bs(wa.svc));
      set("waUtilN", `${int(utilN)} × US$ 0,0113`);
      set("waUtil", bs(wa.util));
      set("waMktN", `${int(mktN)} × US$ 0,074`);
      set("waMkt", bs(wa.mkt));
      set("waAiN", `${int(svcN)} respuestas · GPT-4o mini`);
      set("waAi", bs(wa.ai));
      set("waSttN", `${int(notes)} notas × 30 s × US$ 0,003/min`);
      set("waStt", bs(wa.stt));
      set("waTot", bs(waTot));

      set("plan", mins ? best.name : "—");
      set("planN", mins ? `${int(best.mins)} min incluidos · US$ ${best.fee}/mes` : "");
      set("planFee", bs(mins ? best.fee : 0));
      set("extraN", `${int(mins ? best.extra : 0)} min × US$ 0,08`);
      set("extra", bs(mins ? best.extra * RATE.min : 0));
      set("voiceTot", bs(voiceTot));
      const calls = num("calls");
      set("perCall", calls ? `Bs. ${((voiceTot / calls) * fx).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");

      set("total", bs(waTot + voiceTot));
      set("totalUsd", `≈ US$ ${int(waTot + voiceTot)} al mes`);
    };
    opex.addEventListener("input", calc);
    calc();
  }

  // ---------- Calculadora de cotización ----------
  // Cada fila con [data-price] suma al total; las opcionales llevan un checkbox.
  const table = document.querySelector("table.items");
  if (!table) return;

  const currency = table.dataset.currency || "Bs.";
  const taxRate = parseFloat(table.dataset.tax || "0");
  const fmt = (n) => `${currency} ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = [...table.querySelectorAll("tr[data-price]")];
  rows.forEach((tr) => {
    const cell = tr.querySelector(".num[data-cell='price']");
    if (cell) cell.textContent = tr.dataset.label || fmt(parseFloat(tr.dataset.price));
  });

  const out = (key, val) => document.querySelectorAll(`[data-out="${key}"]`).forEach((el) => (el.textContent = val));

  const recalc = () => {
    let base = 0;
    let extras = 0;
    rows.forEach((tr) => {
      const price = parseFloat(tr.dataset.price);
      const cb = tr.querySelector("input[type='checkbox']");
      if (!cb) base += price;
      else {
        tr.classList.toggle("is-optional", !cb.checked);
        if (cb.checked) extras += price;
      }
    });
    const subtotal = base + extras;
    const tax = subtotal * taxRate;
    out("base", fmt(base));
    out("extras", fmt(extras));
    out("subtotal", fmt(subtotal));
    out("tax", fmt(tax));
    out("total", fmt(subtotal + tax));
    document.querySelectorAll("[data-installment]").forEach((el) => {
      el.textContent = fmt((subtotal + tax) / parseFloat(el.dataset.installment));
    });
    document.querySelectorAll("[data-split]").forEach((el) => {
      el.textContent = fmt((subtotal + tax) * parseFloat(el.dataset.split));
    });
  };

  table.addEventListener("change", recalc);
  recalc();
})();
