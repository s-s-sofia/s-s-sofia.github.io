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
    document.querySelectorAll("[data-split]").forEach((el) => {
      el.textContent = fmt((subtotal + tax) * parseFloat(el.dataset.split));
    });
  };

  table.addEventListener("change", recalc);
  recalc();
})();
