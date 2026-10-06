// Demo del CRM de pedidos de Sofía: un pedido entra por web, WhatsApp o llamada
// y cae como lead en el tablero del CRM. Usa window.SOFIA_PRODUCTOS (productos.js).

(() => {
  const root = document.querySelector("[data-crm-demo]");
  if (!root || !window.SOFIA_PRODUCTOS) return;

  const PRODUCTS = window.SOFIA_PRODUCTOS;
  const byCode = Object.fromEntries(PRODUCTS.map((p) => [p.codigo, p]));
  const LOGO = root.dataset.logo || "";
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const initials = (s) => s.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const lineAbbr = (l) => l.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, "").slice(0, 2);
  const thumb = (p, sm) =>
    p.img
      ? `<span class="thumb${sm ? " thumb--sm" : ""}"><img src="${esc(p.img)}" alt="" loading="lazy"></span>`
      : `<span class="thumb${sm ? " thumb--sm" : ""}" title="${esc(p.linea)}">${esc(lineAbbr(p.linea))}</span>`;

  const ICON = {
    web: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    wa: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
    call: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  };
  const CHANNEL = { web: "Web", wa: "WhatsApp", call: "Llamada" };
  const STAGES = [
    { name: "Nuevo · IA", sub: "Recién registrado por el agente", dot: "#e30613" },
    { name: "Validando stock", sub: "Revisión de inventario", dot: "#f08a24" },
    { name: "Confirmado", sub: "Detalle enviado al cliente", dot: "#3a4bb8" },
    { name: "En reparto", sub: "Asignado a ruta", dot: "#8a3ab8" },
    { name: "Entregado", sub: "Cerrado", dot: "#1fae5b" },
  ];

  // ---------- Estado inicial (pedidos de ejemplo) ----------
  let seq = 1040;
  const now = Date.now();
  const leads = [
    { cliente: "Pensión Los Tajibos", ci: "48•••21", ciudad: "Santa Cruz", canal: "wa", etapa: 0, mins: 4, fecha: "Mañana", items: [["500104", 30], ["590107", 10]] },
    { cliente: "Hamburguesería Rex", ci: "39•••04", ciudad: "Cochabamba", canal: "web", etapa: 1, mins: 41, fecha: "Jueves", items: [["540004", 3], ["544004", 2]] },
    { cliente: "Minimarket El Trompillo", ci: "55•••12", ciudad: "Santa Cruz", canal: "wa", etapa: 2, mins: 75, fecha: "Hoy", items: [["550100", 24], ["560101", 12], ["535700", 24]] },
    { cliente: "Supermercado Norte", ci: "10•••47", ciudad: "Santa Cruz", canal: "web", etapa: 3, mins: 300, fecha: "Hoy", items: [["500106", 120], ["542004", 10], ["650101", 8]] },
  ].map((l) => ({ ...l, id: "P-" + ++seq, at: now - l.mins * 60000, conv: [] }));

  // Casos reales de WhatsApp (13/09/2026), con datos personales ocultos
  const BOT_START = "¡Estamos listos para ayudarte con tu pedido! Solo necesitamos tu confirmación para avanzar. (Responde con “Sí” para continuar)";
  const BOT_CITY = "Por favor, indica desde qué ciudad nos escribes: A - Santa Cruz, B - Cochabamba, C - La Paz, D - Tarija, E - Beni, F - El Alto";
  const BOT_MIN = "Recordamos montos mínimos (refrigerados y congelados Bs 300, huevos 10 maples, conservas Bs 200). Responde: 1) CI o NIT, 2) dirección de entrega, 3) día del pedido, 4) productos y cantidades. En los próximos 8 minutos te enviaremos el detalle y el monto a pagar.";
  const BOT_OK = "✅ ¡Pedido registrado con éxito! Revisa en la imagen adjunta el detalle de tu pedido, la fecha de entrega y la dirección registrada.";
  const REAL = [
    {
      cliente: "Cliente WhatsApp 1",
      ci: "●●●●●●●●",
      ciudad: "Santa Cruz",
      canal: "wa",
      etapa: 4,
      when: "13/09 · 18:20",
      fecha: "Según pedido",
      items: [],
      raw: "2.0-30",
      metric: ["1 min 18 s", "hasta registrar el pedido · 10 mensajes"],
      conv: [
        ["Cliente", "🎤 Nota de voz"],
        ["Bot actual", BOT_START],
        ["Cliente", "sí"],
        ["Bot actual", BOT_CITY],
        ["Cliente", "A"],
        ["Bot actual", BOT_MIN],
        ["Cliente", "2.0-30"],
        ["Asesor", "no hay promoción"],
        ["Asesor", BOT_OK],
        ["Cliente", "🎤 Nota de voz"],
      ],
    },
    {
      cliente: "Cliente WhatsApp 2",
      ci: "●●●●●●●●",
      ciudad: "Santa Cruz",
      canal: "wa",
      etapa: 4,
      when: "13/09 · 16:56",
      fecha: "Mañana",
      items: [["500106", 80]],
      raw: "80 frial mediano para mañana porfa",
      metric: ["30 min 41 s", "hasta registrar el pedido · 18 mensajes"],
      conv: [
        ["Cliente", "ola"],
        ["Bot actual", BOT_START],
        ["Cliente", "si"],
        ["Bot actual", BOT_CITY],
        ["Cliente", "a"],
        ["Bot actual", BOT_MIN],
        ["Cliente", "80 frial mediano para mañana porfa"],
        ["Asesor", "Hola 👋, gracias por tu solicitud. Estamos revisando el inventario y en máximo 8 minutos te enviaremos la confirmación."],
        ["Asesor", "🔥 ¡Oferta especial - Bs 2 menos! Jamón Pizzero y Jamón Familiar al vacío 1 kg."],
        ["Cliente", "🤔"],
        ["Cliente", "🤔"],
        ["Asesor", "Hola 👋, gracias por tu solicitud. Estamos revisando el inventario y en máximo 8 minutos te enviaremos la confirmación."],
        ["Asesor", BOT_OK],
        ["Cliente", "me lo reenviar porfa"],
        ["Cliente", "no descarga"],
        ["Asesor", "Se envía la captura del pedido"],
        ["Cliente", "gracias"],
        ["Asesor", "Fue un placer atenderle, que tenga excelente resto de jornada"],
      ],
    },
    {
      cliente: "Cliente llamada 2",
      ci: "●●●●●●●●",
      ciudad: "Santa Cruz",
      canal: "call",
      etapa: 4,
      when: "18/09 · 14:44",
      fecha: "Según llamada",
      items: [["500106", 40], ["501602", 10], ["501600", 5]],
      audio: "audio_ejemplos/llamada-2.mp3",
      audioLabel: "Grabación real · 18/09/2026 · 1:41",
      conv: [],
    },
    {
      cliente: "Cliente llamada 3",
      ci: "●●●●●●●●",
      ciudad: "Santa Cruz",
      canal: "call",
      etapa: 4,
      when: "21/09 · 18:48",
      fecha: "Según llamada",
      items: [["501003", 25], ["500104", 15]],
      audio: "audio_ejemplos/llamada-3.mp3",
      audioLabel: "Grabación real · 21/09/2026 · 0:55",
      conv: [],
    },
  ].map((l, i) => ({ ...l, real: true, id: "R-0" + (i + 1), at: now - (6 + i) * 86400000 }));
  leads.push(...REAL);

  let filter = "all";
  let openId = null;

  // ---------- CRM: render ----------
  const board = $(".crm__board");
  const ago = (t) => {
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return "ahora";
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    return h < 24 ? `hace ${h} h` : "ayer";
  };
  const units = (l) => l.items.reduce((a, [, q]) => a + q, 0);

  const cardHTML = (l) => {
    const shown = l.items.slice(0, 3);
    return `<article class="olead" draggable="true" data-id="${l.id}" tabindex="0" aria-label="Pedido ${l.id} de ${esc(l.cliente)}">
      <div class="olead__top"><span class="olead__av">${esc(initials(l.cliente))}</span>
        <div><div class="olead__name">${esc(l.cliente)}</div><div class="olead__id">${l.id} · ${esc(l.ciudad)}</div></div></div>
      <ul class="olead__items">${shown.map(([c, q]) => `<li><span>${esc(byCode[c]?.desc || c)}</span><b>× ${q}</b></li>`).join("")}${l.items.length > 3 ? `<li><span>+ ${l.items.length - 3} productos más</span></li>` : ""}${!l.items.length && l.raw ? `<li><span>Texto del cliente: “${esc(l.raw)}”</span></li>` : ""}${!l.items.length && l.audio ? `<li><span>🔊 ${esc(l.audioLabel || "Grabación de la llamada")}</span></li>` : ""}</ul>
      ${l.metric ? `<div class="olead__metric"><b>${esc(l.metric[0])}</b> ${esc(l.metric[1].split(" · ")[0])}</div>` : ""}
      <div class="olead__foot"><span style="display:flex;gap:4px"><span class="chip chip--${l.canal}">${ICON[l.canal]}${CHANNEL[l.canal]}</span>${l.real ? '<span class="chip chip--real">Caso real</span>' : l.canal !== "web" ? '<span class="chip chip--ia">IA</span>' : ""}</span><span>${l.when || ago(l.at)}</span></div>
    </article>`;
  };

  const render = (newId) => {
    const visible = leads.filter((l) => filter === "all" || l.canal === filter);
    board.innerHTML = STAGES.map((s, i) => {
      const list = visible.filter((l) => l.etapa === i).sort((a, b) => b.at - a.at);
      return `<section class="col" data-stage="${i}" style="--dot:${s.dot}">
        <div class="col__head"><b>${s.name}</b><span>${list.length}</span></div>
        <p class="col__sub">${s.sub}</p>
        ${list.map(cardHTML).join("")}
      </section>`;
    }).join("");
    if (newId) {
      const el = board.querySelector(`[data-id="${newId}"]`);
      if (el) {
        el.classList.add("is-new");
        board.scrollTo({ left: 0, behavior: "smooth" });
      }
    }
    // Totales
    $("[data-k=count]").textContent = leads.filter((l) => l.etapa < 4).length;
    $("[data-k=units]").textContent = leads.reduce((a, l) => a + units(l), 0).toLocaleString("es-BO");
    const total = leads.length || 1;
    ["web", "wa", "call"].forEach((c) => {
      const n = leads.filter((l) => l.canal === c).length;
      $(`[data-k=${c}]`).textContent = n;
      $(`[data-bar=${c}]`).style.width = (n / total) * 100 + "%";
    });
  };

  // Filtros por canal
  $$(".crm__filters button").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.f;
      $$(".crm__filters button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      render();
    })
  );

  // Arrastrar y soltar entre etapas
  let dragId = null;
  board.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".olead");
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add("is-drag");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
  });
  board.addEventListener("dragend", () => {
    dragId = null;
    $$(".col").forEach((c) => c.classList.remove("is-over"));
    $$(".olead.is-drag").forEach((c) => c.classList.remove("is-drag"));
  });
  board.addEventListener("dragover", (e) => {
    const col = e.target.closest(".col");
    if (!col || !dragId) return;
    e.preventDefault();
    $$(".col").forEach((c) => c.classList.toggle("is-over", c === col));
  });
  board.addEventListener("drop", (e) => {
    const col = e.target.closest(".col");
    if (!col || !dragId) return;
    e.preventDefault();
    moveTo(dragId, +col.dataset.stage);
  });
  const moveTo = (id, stage) => {
    const l = leads.find((x) => x.id === id);
    if (!l || l.etapa === stage) return render();
    l.etapa = stage;
    render();
    toast(`${l.id} movido a “${STAGES[stage].name}”`);
    if (openId === id) openDrawer(id);
  };

  // ---------- Ficha del pedido ----------
  const drawer = $(".drawer");
  const openDrawer = (id) => {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    openId = id;
    $(".drawer__head").innerHTML = `<div><span class="chip chip--${l.canal}">${ICON[l.canal]}${CHANNEL[l.canal]}</span><h4>${esc(l.cliente)}</h4><small style="color:var(--muted)">${l.id} · ${l.when || ago(l.at)}${l.real ? " · caso real, datos ocultos" : ""}</small></div><button class="drawer__close" type="button" aria-label="Cerrar">×</button>`;
    $(".drawer__body").innerHTML = `
      <div class="drawer__grid">
        <div><small>CI / NIT</small><b>${esc(l.ci)}</b></div>
        <div><small>Ciudad</small><b>${esc(l.ciudad)}</b></div>
        <div><small>Entrega</small><b>${esc(l.fecha)}</b></div>
        <div><small>Unidades</small><b>${units(l)}</b></div>
      </div>
      ${l.metric ? `<div class="drawer__metric"><b>${esc(l.metric[0])}</b><span>${esc(l.metric[1])} con el proceso actual. Con el agente IA, el pedido se registra en la misma conversación.</span></div>` : ""}
      ${l.audio ? `<div><h5>Grabación de la llamada</h5><div class="drawer__audio"><audio controls preload="none" src="${esc(l.audio)}"></audio><small>${esc(l.audioLabel || "")}</small></div></div>` : ""}
      ${l.raw ? `<div><h5>Pedido escrito por el cliente</h5><p class="drawer__raw">“${esc(l.raw)}”</p></div>` : ""}
      <div><h5>Productos del pedido</h5>${!l.items.length ? `<p class="drawer__raw">${l.audio ? "Pedido dictado en la llamada: escuche la grabación. Con el agente IA, los productos y cantidades se registran automáticamente con su código." : "Sin interpretar en el proceso actual: el asesor lo registró a mano."}</p>` : ""}<ul class="drawer__items"${l.items.length ? "" : " hidden"}>${l.items
        .map(([c, q]) => {
          const p = byCode[c] || { codigo: c, desc: c, linea: "" };
          return `<li>${thumb(p, true)}<span><code>${esc(p.codigo)} · ${esc(p.linea)}</code>${esc(p.desc)}</span><b>× ${q}</b></li>`;
        })
        .join("")}</ul></div>
      ${l.conv.length ? `<div><h5>${l.real ? "Conversación real de WhatsApp" : l.canal === "call" ? "Transcripción de la llamada" : l.canal === "wa" ? "Conversación de WhatsApp" : "Origen"}</h5><div class="drawer__conv">${l.conv.map(([w, t]) => `<p><b>${esc(w)}:</b> ${esc(t)}</p>`).join("")}</div></div>` : ""}
      <div><h5>Mover a etapa</h5><div class="drawer__stages">${STAGES.map((s, i) => `<button type="button" data-to="${i}" aria-pressed="${i === l.etapa}">${s.name}</button>`).join("")}</div></div>`;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
  };
  const closeDrawer = () => {
    $$(".drawer audio").forEach((a) => a.pause());
    openId = null;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  };
  board.addEventListener("click", (e) => {
    const card = e.target.closest(".olead");
    if (card) openDrawer(card.dataset.id);
  });
  board.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList.contains("olead")) openDrawer(e.target.dataset.id);
  });
  drawer.addEventListener("click", (e) => {
    if (e.target.closest(".drawer__close")) return closeDrawer();
    const b = e.target.closest("[data-to]");
    if (b && openId) moveTo(openId, +b.dataset.to);
  });

  // Aviso
  let toastT;
  const toast = (msg) => {
    const t = $(".crm__toast");
    t.innerHTML = `<i></i><span>${esc(msg)}</span>`;
    t.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-on"), 3200);
  };

  // Un pedido nuevo cae en el CRM
  const pushLead = (data) => {
    const lead = { ...data, id: "P-" + ++seq, etapa: 0, at: Date.now() };
    leads.push(lead);
    if (filter !== "all" && filter !== lead.canal) {
      filter = "all";
      $$(".crm__filters button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.f === "all"));
    }
    render(lead.id);
    toast(`Nuevo pedido ${lead.id} por ${CHANNEL[lead.canal]} · ${lead.cliente}`);
    // El CRM está debajo del teléfono: bajamos para ver cómo cae el pedido
    const top = $(".crm").getBoundingClientRect().top + scrollY - 90;
    if (Math.abs(scrollY - top) > 40) window.scrollTo({ top, behavior: "smooth" });
    return lead;
  };
  const nextId = () => "P-" + (seq + 1);

  // ---------- Canal: selector ----------
  const runs = { wa: 0, call: 0 };
  $$(".chan-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".chan-tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
      $$(".screen").forEach((s) => (s.hidden = s.dataset.screen !== b.dataset.chan));
    })
  );

  // ---------- Canal web: catálogo ----------
  const cart = {};
  let line = "Todas";
  const shopList = $(".shop__list");
  const lines = ["Todas", ...new Set(PRODUCTS.map((p) => p.linea))];
  $(".shop__chips").innerHTML = lines.map((l) => `<button type="button" aria-pressed="${l === line}" data-line="${esc(l)}">${esc(l)}</button>`).join("");
  const renderShop = () => {
    const q = $(".shop__search").value.trim().toLowerCase();
    const list = PRODUCTS.filter((p) => (line === "Todas" || p.linea === line) && (!q || (p.desc + " " + p.codigo + " " + p.linea).toLowerCase().includes(q)));
    shopList.innerHTML = list.length
      ? list
          .map((p) => {
            const n = cart[p.codigo] || 0;
            return `<div class="prod${n ? " is-on" : ""}" data-code="${p.codigo}">${thumb(p)}
              <div><div class="prod__desc">${esc(p.desc)}</div><div class="prod__meta"><b>${p.codigo}</b> · ${esc(p.linea)}</div></div>
              <div class="qty"><button type="button" data-d="-1" aria-label="Quitar" ${n ? "" : "disabled"}>−</button><input type="number" min="0" value="${n}" aria-label="Cantidad"><button type="button" data-d="1" aria-label="Agregar">+</button></div>
            </div>`;
          })
          .join("")
      : `<p style="padding:20px;text-align:center;color:var(--muted);font-size:13px">Sin resultados</p>`;
    updateCart();
  };
  const updateCart = () => {
    const codes = Object.keys(cart).filter((c) => cart[c] > 0);
    const u = codes.reduce((a, c) => a + cart[c], 0);
    $("[data-cart-info]").innerHTML = `<small>Mi pedido</small><b>${codes.length} productos · ${u} u.</b>`;
    $("[data-cart-go]").disabled = !codes.length;
  };
  const setQty = (code, n) => {
    cart[code] = Math.max(0, Math.min(9999, n | 0));
    const row = shopList.querySelector(`[data-code="${code}"]`);
    if (row) {
      row.classList.toggle("is-on", cart[code] > 0);
      $("input", row).value = cart[code];
      $("[data-d='-1']", row).disabled = !cart[code];
    }
    updateCart();
  };
  shopList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    const code = b.closest(".prod").dataset.code;
    setQty(code, (cart[code] || 0) + +b.dataset.d * (e.shiftKey ? 10 : 1));
  });
  shopList.addEventListener("change", (e) => {
    if (e.target.matches("input")) setQty(e.target.closest(".prod").dataset.code, +e.target.value);
  });
  $(".shop__search").addEventListener("input", renderShop);
  $(".shop__chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-line]");
    if (!b) return;
    line = b.dataset.line;
    $$(".shop__chips button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderShop();
  });
  // Pedido de ejemplo precargado para que el flujo se pruebe en un clic
  [["500106", 40], ["542004", 4], ["590108", 6]].forEach(([c, q]) => (cart[c] = q));

  const shopView = $("[data-shop-view]");
  const checkout = $("[data-checkout]");
  $("[data-cart-go]").addEventListener("click", () => {
    const codes = Object.keys(cart).filter((c) => cart[c] > 0);
    $("[data-checkout-list]").innerHTML = codes.map((c) => `<li><span>${esc(byCode[c].desc)}</span><b>${c} × ${cart[c]}</b></li>`).join("");
    shopView.hidden = true;
    checkout.hidden = false;
  });
  $("[data-checkout-back]").addEventListener("click", () => {
    checkout.hidden = true;
    shopView.hidden = false;
  });
  $("[data-checkout-send]").addEventListener("click", () => {
    const codes = Object.keys(cart).filter((c) => cart[c] > 0);
    if (!codes.length) return;
    const f = (n) => $(`[data-f="${n}"]`).value.trim();
    pushLead({
      cliente: f("cliente") || "Cliente web",
      ci: f("ci") || "—",
      ciudad: f("ciudad"),
      canal: "web",
      fecha: f("fecha"),
      items: codes.map((c) => [c, cart[c]]),
      conv: [["Portal web", `Pedido enviado desde el catálogo en línea con ${codes.length} productos.`]],
    });
    codes.forEach((c) => delete cart[c]);
    checkout.hidden = true;
    shopView.hidden = false;
    renderShop();
  });

  // ---------- Canal WhatsApp: conversación con el agente IA ----------
  const wa = $(".wa");
  const waOrder = [["500106", 80], ["542004", 2], ["534210", 10]];
  const t0 = () => {
    const d = new Date();
    return d.toTimeString().slice(0, 5);
  };
  const waAdd = (side, who, html) => {
    const m = document.createElement("div");
    m.className = `wa__msg wa__msg--${side}`;
    m.innerHTML = `<span class="wa__who">${who}</span>${html}<time>${t0()}</time>`;
    wa.appendChild(m);
    wa.scrollTop = wa.scrollHeight;
  };
  const waTyping = async (ms = 1100) => {
    const t = document.createElement("div");
    t.className = "wa__typing";
    t.innerHTML = "<i></i><i></i><i></i>";
    wa.appendChild(t);
    wa.scrollTop = wa.scrollHeight;
    await sleep(ms);
    t.remove();
  };
  const orderHTML = (items) =>
    `<div class="wa__order">${items
      .map(([c, q]) => {
        const p = byCode[c];
        return `<div>${thumb(p, true)}<span><code>${c}</code>${esc(p.desc)}</span><b>× ${q}</b></div>`;
      })
      .join("")}</div>`;
  const playWA = async () => {
    const run = ++runs.wa;
    const alive = () => run === runs.wa;
    const btn = $("[data-wa-play]");
    btn.disabled = true;
    wa.innerHTML = "";
    const conv = [];
    const step = async (fn, wait = 700) => {
      if (!alive()) throw 0;
      await sleep(wait);
      if (!alive()) throw 0;
      fn();
    };
    try {
      await step(() => waAdd("in", "Restaurante El Fogón", "Hola, buenas tardes 👋"), 300);
      conv.push(["Cliente", "Hola, buenas tardes"]);
      await waTyping();
      await step(() => waAdd("out", "Agente IA · Sofía", "¡Hola, Restaurante El Fogón! 😊 Te identifiqué por tu número (NIT 12•••63, Santa Cruz). ¿Qué necesitas para tu pedido?"), 0);
      conv.push(["Agente IA", "Saluda e identifica al cliente por su número"]);
      await step(
        () =>
          waAdd(
            "in",
            "Restaurante El Fogón",
            `<span class="wa__voice"><span class="wa__voice-play">▶</span><span class="wa__voice-wave"></span><small>0:07</small></span><span class="wa__transcript"><b>Transcripción automática</b>“Quiero 80 frial mediano, 2 cajas de nuggets dinos y 10 de salchicha viena para mañana”</span>`
          ),
        900
      );
      conv.push(["Cliente (nota de voz)", "Quiero 80 frial mediano, 2 cajas de nuggets dinos y 10 de salchicha viena para mañana"]);
      await waTyping(1500);
      await step(() => waAdd("out", "Agente IA · Sofía", `Perfecto, este es tu pedido:${orderHTML(waOrder)}📅 Entrega: mañana\n📍 Av. Banzer 4.º anillo (dirección registrada)\n¿Lo confirmo? Responde <b>Sí</b> o dime qué cambiar.`), 0);
      conv.push(["Agente IA", "Interpreta el pedido, lo traduce a códigos de producto y pide confirmación"]);
      await step(() => waAdd("in", "Restaurante El Fogón", "Sí, confirma por favor"), 1300);
      conv.push(["Cliente", "Sí, confirma por favor"]);
      await waTyping(900);
      if (!alive()) throw 0;
      const id = nextId();
      waAdd("out", "Agente IA · Sofía", `✅ ¡Pedido <b>${id}</b> registrado! Lo estamos validando con inventario y te avisaremos cuando salga a reparto. ¡Gracias por tu preferencia! 🙏`);
      conv.push(["Agente IA", `Registra el pedido ${id} en el CRM`]);
      await sleep(600);
      if (!alive()) throw 0;
      pushLead({ cliente: "Restaurante El Fogón", ci: "12•••63", ciudad: "Santa Cruz", canal: "wa", fecha: "Mañana", items: waOrder, conv });
    } catch (e) {
      if (e !== 0) throw e;
    } finally {
      if (alive()) btn.disabled = false;
    }
  };
  $("[data-wa-play]").addEventListener("click", playWA);

  // ---------- Canal llamada: reproduce una llamada real ----------
  const call = $(".call");
  const tr = $(".call__transcript");
  const status = $(".call__status");
  const CALL_AUDIO = "audio_ejemplos/llamada-1.mp3";
  const audio = new Audio();
  audio.preload = "none";
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  let live = false;

  const resetCall = () => {
    live = false;
    audio.pause();
    call.classList.add("is-ringing");
    call.classList.remove("is-live");
    status.textContent = "Llamada entrante…";
    tr.innerHTML = `<p class="call__empty">Presione el botón verde para atender. Se reproducirá una llamada real de un cliente de Sofía y, al terminar, el pedido caerá en el CRM.</p>`;
    $("[data-call-answer]").disabled = false;
    $("[data-call-end]").disabled = true;
  };

  const finishCall = () => {
    if (!live) return;
    live = false;
    const dur = audio.duration || 72;
    audio.pause();
    call.classList.remove("is-live");
    status.textContent = "Llamada finalizada · lead registrado en el CRM";
    $("[data-call-end]").disabled = true;
    pushLead({
      cliente: "Cliente llamada 1",
      ci: "●●●●●●●●",
      ciudad: "Santa Cruz",
      canal: "call",
      fecha: "Según llamada",
      items: [["500105", 30], ["500102", 20], ["501602", 8]],
      real: true,
      audio: CALL_AUDIO,
      audioLabel: `Grabación real · 18/09/2026 · ${mmss(dur).replace(/^0/, "")}`,
      conv: [["Central telefónica", "Llamada recibida y grabada; el lead se crea con la grabación adjunta para registrar el pedido."]],
    });
    setTimeout(() => !live && ($("[data-call-answer]").disabled = false), 1200);
  };

  const playCall = () => {
    $$("audio", root).forEach((a) => a.pause());
    live = true;
    $("[data-call-answer]").disabled = true;
    $("[data-call-end]").disabled = false;
    call.classList.remove("is-ringing");
    call.classList.add("is-live");
    status.textContent = "En llamada · 00:00";
    tr.innerHTML = `<div class="call__now"><b>Reproduciendo llamada real</b><span>Cliente de Sofía · 18/09/2026</span><div class="call__prog"><i></i></div><small data-call-time>00:00</small></div>`;
    audio.src = CALL_AUDIO;
    audio.currentTime = 0;
    audio.play().catch(() => {
      status.textContent = "Toque de nuevo para reproducir el audio";
      $("[data-call-answer]").disabled = false;
    });
  };
  audio.addEventListener("timeupdate", () => {
    if (!live) return;
    const t = audio.currentTime;
    const d = audio.duration || 0;
    status.textContent = `En llamada · ${mmss(t)}`;
    const bar = $(".call__prog i", tr);
    if (bar && d) bar.style.width = (t / d) * 100 + "%";
    const tt = $("[data-call-time]", tr);
    if (tt) tt.textContent = `${mmss(t)} / ${d ? mmss(d) : "--:--"}`;
  });
  audio.addEventListener("ended", finishCall);
  $("[data-call-answer]").addEventListener("click", playCall);
  $("[data-call-end]").addEventListener("click", () => (live ? finishCall() : resetCall()));
  // Al cambiar de canal se detiene la llamada en curso
  $$(".chan-tabs button").forEach((b) => b.addEventListener("click", () => live && b.dataset.chan !== "call" && finishCall()));

  // Logo en cabeceras de pantalla
  $$(".scr-head__logo").forEach((el) => (el.innerHTML = LOGO ? `<img src="${esc(LOGO)}" alt="">` : "S"));
  $$(".call__wave").forEach((w) => (w.innerHTML = "<i></i>".repeat(28)));

  renderShop();
  resetCall();
  render();
  setInterval(() => render(), 60000);
})();
