// Servisofts × Sofía — exportación real a PDF de una cotización
// Genera un documento A4 con texto seleccionable a partir del contenido de la página
// (ítems, opcionales marcados, cuotas, costos de operación y condiciones). Uso:
//   <button data-pdf-download>Descargar PDF</button>
//   <script src="../cotizacion-pdf.js"></script>

(() => {
  const LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  ];
  const RED = [227, 6, 19];
  const INK = [29, 20, 21];
  const MUTED = [109, 98, 100];
  const LINE = [234, 223, 221];
  const PAPER = [251, 248, 246];
  const PINK = [253, 233, 234];

  const loadScript = (src) =>
    new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = () => fail(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  const loadLibs = async () => {
    if (!window.jspdf) await loadScript(LIBS[0]);
    if (!window.jspdf.jsPDF.API.autoTable) await loadScript(LIBS[1]);
    return window.jspdf.jsPDF;
  };

  // Las fuentes estándar del PDF solo cubren Latin-1: normalizamos símbolos
  const clean = (t) =>
    (t || "")
      .replace(/\s+/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...")
      .replace(/≈\s?/g, "aprox. ")
      .replace(/→/g, "->")
      .replace(/[^\x00-\xFF]/g, "")
      .trim();
  const text = (el) => clean(el ? el.textContent : "");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const cardByTitle = (word) => $$(".card").find((c) => ($("h2", c)?.textContent || "").includes(word));

  const logoData = () =>
    new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        try {
          // El PNG es cuadrado con mucho blanco: recortamos al óvalo del logo
          const w = img.naturalWidth, h = img.naturalHeight;
          const sx = w * 0.05, sy = h * 0.23, sw = w * 0.9, sh = h * 0.54;
          const c = document.createElement("canvas");
          c.width = sw;
          c.height = sh;
          c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ok(c.toDataURL("image/png"));
        } catch {
          ok(null);
        }
      };
      img.onerror = () => ok(null);
      img.src = $(".nav__brand img")?.src || "";
    });

  // ---------- Lectura de la página ----------
  const readPage = () => {
    const meta = $$(".doc__meta > div").map((d) => [text($("small", d)), text($("b", d))]);
    const liRich = (li) => {
      const b = $("b", li);
      const bold = b ? text(b) : "";
      const rest = clean(li.textContent.replace(b ? b.textContent : "", ""));
      return { bold, rest };
    };
    const items = $$("table.items tr[data-price]")
      .filter((tr) => {
        const cb = $("input[type=checkbox]", tr);
        return !cb || cb.checked;
      })
      .map((tr) => {
        const td = tr.cells[0];
        const small = $("small", td);
        const name = clean([...td.childNodes].filter((n) => n !== small).map((n) => n.textContent).join(" "));
        return {
          name,
          desc: text(small),
          optional: !!$("input[type=checkbox]", tr),
          term: text(tr.cells[1]),
          price: text($(".num", tr)),
        };
      });
    const opex = $("#costos-operacion");
    const val = (k) => $(`[data-in="${k}"]`, opex)?.value;
    const out = (k) => text($(`[data-o="${k}"]`, opex));
    return {
      code: meta.find(([k]) => /N\./.test(k))?.[1] || "Cotizacion",
      title: text($(".page-hero h1")),
      lead: text($(".page-hero .lead")),
      meta,
      scope: $$("ul.check li", cardByTitle("Alcance")).map(liRich),
      meetings: $$(".meeting").map((m) => ({
        title: text($(".meeting__head b", m)),
        date: text($(".meeting__head time", m)),
        people: $$(".meeting__people li", m).map((li) => [text($("b", li)), text($("span", li))]),
        notes: $$(".meeting__notes:not(.meeting__next) li", m).map(text),
        next: $$(".meeting__next li", m).map(text),
      })),
      items,
      totals: {
        base: text($('.summary [data-out="base"]')),
        extras: text($('.summary [data-out="extras"]')),
        total: text($('.summary [data-out="total"]')),
      },
      payLead: text($(".card__lead", cardByTitle("pago"))),
      payments: $$(".payment").map((p) => ({ title: text($("b", p)), when: text($("span", p)), amount: text($("strong", p)) })),
      maintenance: $(".summary__row--monthly")
        ? (() => {
            const span = $(".summary__row--monthly span:first-child");
            const small = $("small", span);
            const main = clean([...span.childNodes].filter((n) => n !== small).map((n) => n.textContent).join(" "));
            return { label: main + (small ? " · " + text(small) : ""), amount: text($(".summary__row--monthly span:last-child")) };
          })()
        : null,
      opex: opex && {
        notice: text($(".notice div", opex)),
        assumptions: `${val("waOrders") ? val("waOrders") + " pedidos por WhatsApp y " : ""}${val("calls")} llamadas de ${val("callMin")} min al mes; tipo de cambio Bs ${val("fx")} por US$.`,
        rows: [
          ...($('[data-o="waTot"]', opex) ? [["WhatsApp (Meta) y OpenAI", out("waTot")]] : []),
          ["Voz (ElevenLabs, plan " + out("plan") + ")", out("voiceTot")],
          ["Costo por llamada", out("perCall")],
        ],
        total: out("total"),
        totalUsd: out("totalUsd"),
      },
      stack: $$(".stack__item").map((s) => [text($(".stack__tag", s)), text($("b", s)), text($("small", s))]),
      kpis: $$(".kpi").map((k) => ({ title: text($(".kpi__head b", k)), items: $$("li", k).map(text) })),
      conditions: $$("ul.check li", cardByTitle("Condiciones")).map(text),
      sign: $$(".sign > div").map((d) => [text($("b", d)), clean(d.textContent.replace($("b", d)?.textContent || "", ""))]),
    };
  };

  // ---------- Construcción del PDF ----------
  const build = async () => {
    const jsPDF = await loadLibs();
    const data = readPage();
    const logo = await logoData();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 16, CW = W - M * 2;
    let y = 0;

    const color = (c, kind = "text") => (kind === "fill" ? doc.setFillColor(...c) : kind === "draw" ? doc.setDrawColor(...c) : doc.setTextColor(...c));
    const font = (size, style = "normal", c = INK) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      color(c);
    };
    const need = (h) => {
      if (y + h > H - 18) {
        doc.addPage();
        y = 20;
      }
    };
    const para = (t, size = 9.5, style = "normal", c = INK, x = M, w = CW, lh = 1.45) => {
      font(size, style, c);
      const lines = doc.splitTextToSize(t, w);
      const step = (size * 0.3528) * lh;
      need(lines.length * step);
      doc.text(lines, x, y + size * 0.3528);
      y += lines.length * step;
    };
    const section = (label) => {
      need(18);
      y += 5;
      font(8, "bold", RED);
      doc.text(label.toUpperCase(), M, y, { charSpace: 0.6 });
      color(RED, "draw");
      doc.setLineWidth(0.5);
      doc.line(M, y + 2, M + 12, y + 2);
      color(LINE, "draw");
      doc.setLineWidth(0.2);
      doc.line(M + 13, y + 2, W - M, y + 2);
      y += 6;
    };
    const checkerStrip = (yy, h = 3) => {
      const s = h;
      for (let i = 0, x = 0; x < W; i++, x += s) {
        if (i % 2 === 0) {
          color(RED, "fill");
          doc.rect(x, yy, s, s / 2, "F");
        } else {
          color(RED, "fill");
          doc.rect(x, yy + s / 2, s, s / 2, "F");
        }
      }
    };

    // Cabecera
    color(RED, "fill");
    doc.rect(0, 0, W, 38, "F");
    color([255, 255, 255], "fill");
    doc.roundedRect(M, 8, 34, 22, 11, 11, "F");
    if (logo) doc.addImage(logo, "PNG", M + 4, 11.5, 26, 15.6);
    else {
      font(16, "bolditalic", RED);
      doc.text("Sofía", M + 17, 21, { align: "center" });
    }
    font(8, "bold", [255, 255, 255]);
    doc.text("PROPUESTA COMERCIAL", W - M, 14, { align: "right", charSpace: 0.6 });
    font(15, "bold", [255, 255, 255]);
    doc.text(data.code, W - M, 22, { align: "right" });
    font(9, "normal", [255, 225, 227]);
    doc.text("Servisofts SRL  ·  para Sofía Ltda.", W - M, 28.5, { align: "right" });
    checkerStrip(38, 3);
    y = 52;

    // Título
    font(22, "bold", INK);
    const tl = doc.splitTextToSize(data.title, CW);
    doc.text(tl, M, y);
    y += tl.length * 8.5;
    para(data.lead, 10.5, "normal", MUTED);

    // Datos
    y += 5;
    const mw = (CW - 3 * 4) / 4;
    data.meta.slice(0, 4).forEach(([k, v], i) => {
      const x = M + i * (mw + 4);
      color(PAPER, "fill");
      doc.roundedRect(x, y, mw, 15, 3, 3, "F");
      font(7, "bold", MUTED);
      doc.text(k.toUpperCase(), x + 4, y + 5.5, { charSpace: 0.4 });
      font(10.5, "bold", INK);
      doc.text(v, x + 4, y + 11.5);
    });
    y += 19;

    // Reuniones
    if (data.meetings.length) {
      section("Reuniones");
      data.meetings.forEach((m, i) => {
        need(14);
        font(10.5, "bold");
        doc.text(`${i + 1}. ${m.title}`, M, y + 4);
        font(9, "normal", MUTED);
        doc.text(m.date, W - M, y + 4, { align: "right" });
        y += 7;
        m.people.forEach(([name, role]) => {
          need(5);
          font(9, "bold");
          doc.text(name, M + 5, y + 3);
          const nw = doc.getTextWidth(name);
          font(9, "normal", MUTED);
          doc.text("·  " + role, M + 5 + nw + 2, y + 3);
          y += 4.6;
        });
        const bullets = (list) => list.forEach((t) => {
          font(9, "normal");
          const lines = doc.splitTextToSize(t, CW - 10);
          const step = 9 * 0.3528 * 1.35;
          need(lines.length * step + 1);
          color(RED, "fill");
          doc.rect(M + 5.6, y + 1.3, 1.4, 1.4, "F");
          doc.text(lines, M + 9, y + 3);
          y += lines.length * step + 1;
        });
        bullets(m.notes);
        if (m.next.length) {
          need(10);
          font(7.5, "bold", MUTED);
          doc.text("PRÓXIMOS PASOS", M + 5, y + 4, { charSpace: 0.4 });
          y += 6;
          bullets(m.next);
        }
        y += 3;
      });
    }

    // Alcance
    section("Alcance del proyecto");
    data.scope.forEach(({ bold, rest }) => {
      font(9.5, "normal");
      const full = (bold ? bold + " " : "") + rest;
      const lines = doc.splitTextToSize(full, CW - 7);
      const step = 9.5 * 0.3528 * 1.45;
      need(lines.length * step + 1.5);
      color(RED, "fill");
      doc.circle(M + 1.6, y + 1.9, 1.2, "F");
      // primera línea: parte en negrita + resto
      let yy = y + 3.2;
      lines.forEach((ln, idx) => {
        if (idx === 0 && bold && ln.startsWith(bold)) {
          font(9.5, "bold");
          doc.text(bold, M + 6, yy);
          const bw = doc.getTextWidth(bold + " ");
          font(9.5, "normal");
          doc.text(ln.slice(bold.length + 1), M + 6 + bw, yy);
        } else {
          font(9.5, "normal");
          doc.text(ln, M + 6, yy);
        }
        yy += step;
      });
      y += lines.length * step + 1.5;
    });

    // Detalle económico
    section("Detalle económico");
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [["Concepto", "Plazo", "Monto"]],
      body: data.items.map((it) => [
        { content: it.name + (it.optional ? " (opcional)" : "") + (it.desc ? "\n" + it.desc : ""), raw: it },
        it.term,
        it.price,
      ]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, textColor: INK, cellPadding: { top: 2.6, bottom: 2.6, left: 1.5, right: 1.5 }, lineColor: LINE },
      headStyles: { fontSize: 7.5, fontStyle: "bold", textColor: MUTED },
      didParseCell: (h) => {
        if (h.section === "head" && h.column.index === 2) h.cell.styles.halign = "right";
      },
      columnStyles: { 1: { cellWidth: 22 }, 2: { cellWidth: 30, halign: "right", fontStyle: "bold" } },
      didDrawCell: (h) => {
        if (h.section === "head" && h.column.index === 0) {
          color(RED, "draw");
          doc.setLineWidth(0.6);
          doc.line(M, h.cell.y + h.cell.height, W - M, h.cell.y + h.cell.height);
        }
        if (h.section === "body") {
          color(LINE, "draw");
          doc.setLineWidth(0.2);
          doc.line(h.cell.x, h.cell.y + h.cell.height, h.cell.x + h.cell.width, h.cell.y + h.cell.height);
        }
      },
      willDrawCell: (h) => {
        if (h.section !== "body" || h.column.index !== 0) return;
        const it = h.cell.raw.raw;
        if (!it) return;
        h.cell.text = [];
        const x = h.cell.x + 1.5;
        let yy = h.cell.y + 5.2;
        font(9, "bold");
        const nm = doc.splitTextToSize(it.name + (it.optional ? "  (opcional)" : ""), h.cell.width - 3);
        doc.text(nm, x, yy);
        yy += nm.length * 3.9;
        if (it.desc) {
          font(7.6, "normal", MUTED);
          doc.text(doc.splitTextToSize(it.desc, h.cell.width - 3), x, yy);
        }
        font(8.5, "normal");
      },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Totales
    need(30);
    const bx = W - M - 78;
    [["Alcance base", data.totals.base], ["Opcionales", data.totals.extras]].forEach(([k, v]) => {
      font(9, "normal", MUTED);
      doc.text(k, bx, y + 4);
      font(9, "bold");
      doc.text(v, W - M - 4, y + 4, { align: "right" });
      y += 6;
    });
    color(RED, "fill");
    doc.roundedRect(bx - 4, y + 1, 82, 13, 3, 3, "F");
    font(8, "bold", [255, 255, 255]);
    doc.text("INVERSIÓN TOTAL", bx, y + 9.2, { charSpace: 0.5 });
    font(13, "bold", [255, 255, 255]);
    doc.text(data.totals.total, W - M - 4, y + 9.6, { align: "right" });
    y += 18;

    // Forma de pago
    if (data.payments.length) {
      section("Forma de pago");
      if (data.payLead) para(data.payLead, 9.5, "normal", MUTED);
      y += 2;
      const n = data.payments.length;
      const pw = (CW - (n - 1) * 4) / n;
      font(7.5, "normal");
      const whenLines = data.payments.map((p) => doc.splitTextToSize(p.when, pw - 8));
      const maxL = Math.max(...whenLines.map((l) => l.length));
      const ph = 17 + maxL * 3.2;
      need(ph + 2);
      data.payments.forEach((p, i) => {
        const x = M + i * (pw + 4);
        color(LINE, "draw");
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, pw, ph, 3, 3, "S");
        font(12, "bold", RED);
        doc.text(p.title, x + 4, y + 7);
        font(7.5, "normal", MUTED);
        doc.text(whenLines[i], x + 4, y + 11.5);
        font(9.5, "bold");
        doc.text(p.amount, x + 4, y + ph - 3.5);
      });
      y += ph + 4;
    }
    if (data.maintenance) {
      need(12);
      color(PINK, "fill");
      doc.roundedRect(M, y, CW, 10, 3, 3, "F");
      font(9, "normal", [122, 0, 8]);
      doc.text(data.maintenance.label, M + 4, y + 6.4);
      font(10, "bold", RED);
      doc.text(data.maintenance.amount, W - M - 4, y + 6.4, { align: "right" });
      y += 14;
    }

    // Costos de operación
    if (data.opex) {
      section("Costo mensual de operación (estimado)");
      need(16);
      color(PINK, "fill");
      const nl = doc.splitTextToSize(data.opex.notice, CW - 10);
      const nh = nl.length * 4.1 + 6;
      doc.roundedRect(M, y, CW, nh, 3, 3, "F");
      color(RED, "fill");
      doc.rect(M, y, 1.2, nh, "F");
      font(8.8, "normal", [122, 0, 8]);
      doc.text(nl, M + 5, y + 5.5);
      y += nh + 4;
      data.opex.rows.forEach(([k, v]) => {
        need(7);
        font(9.5, "normal");
        doc.text(k, M, y + 4);
        font(9.5, "bold");
        doc.text(v, W - M, y + 4, { align: "right" });
        color(LINE, "draw");
        doc.setLineWidth(0.2);
        doc.line(M, y + 6.5, W - M, y + 6.5);
        y += 8;
      });
      need(12);
      font(10, "bold", RED);
      doc.text("Total mensual estimado", M, y + 5);
      doc.text(`${data.opex.total}  (${data.opex.totalUsd.replace(/ al mes$/, "")})`, W - M, y + 5, { align: "right" });
      y += 9;
      para("Supuestos: " + data.opex.assumptions, 8, "normal", MUTED);
    }

    // Tecnologías
    if (data.stack.length) {
      need(20 + data.stack.length * 7);
      section("Tecnologías sin costo de licencia");
      doc.autoTable({
        startY: y,
        margin: { left: M, right: M },
        body: data.stack.map(([tag, name, desc]) => [tag, name, desc, "Sin costo"]),
        theme: "plain",
        styles: { fontSize: 8.5, cellPadding: 1.8, textColor: INK },
        columnStyles: { 0: { cellWidth: 30, textColor: MUTED, fontSize: 7.5 }, 1: { cellWidth: 26, fontStyle: "bold" }, 3: { cellWidth: 20, textColor: RED, fontStyle: "bold", halign: "right", fontSize: 7.5 } },
      });
      y = doc.lastAutoTable.finalY + 2;
    }

    // Dashboards
    if (data.kpis.length) {
      section("Dashboards de KPIs");
      const cw2 = (CW - 6) / 2;
      for (let i = 0; i < data.kpis.length; i += 2) {
        const pair = data.kpis.slice(i, i + 2);
        const hh = Math.max(...pair.map((k) => 8 + k.items.length * 4.4)) + 3;
        need(hh + 3);
        pair.forEach((k, j) => {
          const x = M + j * (cw2 + 6);
          color(PAPER, "fill");
          doc.roundedRect(x, y, cw2, hh, 3, 3, "F");
          font(10.5, "bold");
          doc.text(k.title, x + 4, y + 6.5);
          k.items.forEach((t, n) => {
            color(RED, "fill");
            doc.rect(x + 4, y + 10.2 + n * 4.4, 1.4, 1.4, "F");
            font(8.3, "normal");
            doc.text(doc.splitTextToSize(t, cw2 - 12)[0], x + 7.5, y + 11.6 + n * 4.4);
          });
        });
        y += hh + 4;
      }
    }

    // Condiciones
    if (data.conditions.length) {
      section("Condiciones");
      data.conditions.forEach((c) => {
        font(9, "normal");
        const lines = doc.splitTextToSize(c, CW - 6);
        const step = 9 * 0.3528 * 1.35;
        need(lines.length * step + 1);
        color(RED, "fill");
        doc.rect(M + 0.6, y + 1.3, 1.6, 1.6, "F");
        doc.text(lines, M + 5, y + 3);
        y += lines.length * step + 1;
      });
    }

    // Firmas
    if (data.sign.length) {
      need(27);
      y += 13;
      const sw = (CW - 20) / 2;
      data.sign.forEach(([name, role], i) => {
        const x = M + i * (sw + 20);
        color(INK, "draw");
        doc.setLineWidth(0.3);
        doc.line(x, y, x + sw, y);
        font(9.5, "bold");
        doc.text(name, x, y + 5);
        font(8, "normal", MUTED);
        doc.text(role, x, y + 9.5);
      });
      y += 14;
    }

    // Pie de página en todas las hojas
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      color(LINE, "draw");
      doc.setLineWidth(0.2);
      doc.line(M, H - 12, W - M, H - 12);
      font(7.5, "normal", MUTED);
      doc.text(`Servisofts SRL  ·  ${data.code}  ·  Documento confidencial preparado para Sofía Ltda.`, M, H - 7.5);
      doc.text(`Página ${p} de ${pages}`, W - M, H - 7.5, { align: "right" });
    }

    doc.setProperties({ title: `${data.code} - ${data.title}`, subject: "Propuesta comercial", author: "Servisofts SRL", creator: "Servisofts SRL" });
    return { doc, filename: `${data.code} - Sofia - ${data.title}.pdf`.replace(/[\\/:*?"<>|]/g, "") };
  };

  window.cotizacionPDF = build;

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-pdf-download]");
    if (!btn) return;
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Generando PDF…";
    try {
      const { doc, filename } = await build();
      doc.save(filename);
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });
})();
