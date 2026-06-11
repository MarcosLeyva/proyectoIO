// ── Skeleton loader ───────────────────────────────────────────────────────────
export function showSpinner(id) {
  document.getElementById(id).innerHTML = `
    <div class="section-card stagger">
      <div class="skeleton" style="height:14px;width:120px;"></div>
      <div style="display:flex;gap:10px;">
        <div class="skeleton" style="height:72px;flex:1;border-radius:10px;"></div>
        <div class="skeleton" style="height:72px;flex:1;border-radius:10px;"></div>
        <div class="skeleton" style="height:72px;flex:1;border-radius:10px;"></div>
      </div>
      <div class="skeleton" style="height:48px;border-radius:8px;"></div>
      <div class="skeleton" style="height:160px;border-radius:10px;"></div>
    </div>`;
}

// ── Error ─────────────────────────────────────────────────────────────────────
export function showError(id, msg) {
  document.getElementById(id).innerHTML =
    `<div class="alert-error anim-slide"><strong>Error:</strong> ${msg}</div>`;
}

// ── Interpretation ────────────────────────────────────────────────────────────
export function showInterpretacion(text) {
  return `<div class="interp">
    <div class="interp-label">Interpretación</div>
    <div class="interp-text">${text}</div>
  </div>`;
}

// ── Steps ─────────────────────────────────────────────────────────────────────
export function renderPasos(pasos) {
  if (!pasos?.length) return "";
  return `<div class="flex-col gap-3">
    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;">
      Procedimiento paso a paso
    </div>
    ${pasos.map((p, i) => `
      <div class="step-card">
        <div class="step-title">Paso ${i+1} — ${p.titulo}</div>
        ${p.detalle ? `<div class="step-detail">${p.detalle}</div>` : ""}
        ${p.matriz    ? renderMatriz(p.matriz)    : ""}
        ${p.asignacion? renderMatriz(p.asignacion): ""}
      </div>`).join("")}
  </div>`;
}

export function renderMatriz(mat) {
  if (!mat?.length) return "";
  return `<div class="overflow-x" style="margin-top:8px;">
    <table class="io-table" style="font-size:12px;">
      ${mat.map(row => `<tr>${row.map(v =>
        `<td>${typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}</td>`
      ).join("")}</tr>`).join("")}
    </table>
  </div>`;
}

export function makeTable(headers, rows) {
  return `<div class="overflow-x">
    <table class="io-table">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r =>
        `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`
      ).join("")}</tbody>
    </table>
  </div>`;
}

// ── Section card ──────────────────────────────────────────────────────────────
export function sectionCard(title, content) {
  return `<div class="section-card">
    <div class="card-header">${title}</div>
    <div class="flex-col gap-3">${content}</div>
  </div>`;
}

// ── Stat card with animated number ───────────────────────────────────────────
export function statCard(label, value, sub = "") {
  const isNumeric = !isNaN(parseFloat(value));
  return `<div class="stat-card anim-scale">
    <div class="stat-label">${label}</div>
    <div class="stat-value${isNumeric ? ' js-count' : ''}" data-target="${value}">${isNumeric ? "0" : value}</div>
    ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
  </div>`;
}

// Trigger count-up for all .js-count elements in a container
export function animateNumbers(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.querySelectorAll(".js-count").forEach(node => {
    const target = parseFloat(node.dataset.target);
    if (isNaN(target)) return;
    const isFloat = !Number.isInteger(target);
    const decimals = isFloat ? String(node.dataset.target).split(".")[1]?.length ?? 2 : 0;
    const duration = 600;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      node.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// ── Buttons ───────────────────────────────────────────────────────────────────
export function primaryBtn(id, text) {
  return `<button id="${id}" class="btn btn-primary">${text}</button>`;
}

export function secondaryBtn(id, text) {
  return `<button id="${id}" class="btn btn-secondary">${text}</button>`;
}

// ── PDF export ────────────────────────────────────────────────────────────────
export async function exportPDF(containerId, filename, titulo) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const btn = document.querySelector(`[data-pdf="${containerId}"]`);
  if (btn) { btn.textContent = "Generando..."; btn.disabled = true; }

  try {
    const canvas = await window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#f4f6f8" });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const usableW = pageW - margin * 2;

    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageW, 16, "F");
    pdf.setFontSize(10); pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold");
    pdf.text("IO Solver — Investigación de Operaciones", margin, 10.5);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(9);
    pdf.text(titulo, pageW - margin, 10.5, { align: "right" });

    const imgData = canvas.toDataURL("image/png");
    const imgH = (canvas.height * usableW) / canvas.width;
    let y = 22;

    if (imgH <= pageH - y - margin) {
      pdf.addImage(imgData, "PNG", margin, y, usableW, imgH);
    } else {
      let done = 0;
      while (done < imgH) {
        const slice = Math.min(imgH - done, pageH - y - margin);
        const sc = document.createElement("canvas");
        sc.width = canvas.width;
        sc.height = Math.round((slice / imgH) * canvas.height);
        sc.getContext("2d").drawImage(canvas,
          0, Math.round((done / imgH) * canvas.height),
          canvas.width, sc.height, 0, 0, canvas.width, sc.height);
        pdf.addImage(sc.toDataURL("image/png"), "PNG", margin, y, usableW, slice);
        done += slice;
        if (done < imgH) { pdf.addPage(); y = margin; }
      }
    }

    pdf.setFontSize(7.5); pdf.setTextColor(160,160,160);
    pdf.text(`Generado por IO Solver · ${new Date().toLocaleDateString("es-MX")}`, margin, pageH - 5);
    pdf.save(filename);
  } finally {
    if (btn) { btn.textContent = "Exportar PDF"; btn.disabled = false; }
  }
}

// ── Toast notification ────────────────────────────────────────────────────────
export function showToast(msg, type = "success") {
  const id = "io-toast-" + Date.now();
  const colors = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", icon: "✓" },
    error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "✕" },
    info:    { bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3", icon: "i" },
  };
  const c = colors[type] || colors.info;
  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${c.bg};border:1.5px solid ${c.border};color:${c.text};
    border-radius:8px;padding:11px 16px;font-size:13px;font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);display:flex;align-items:center;gap:8px;
    font-family:Inter,sans-serif;max-width:320px;
    animation:slideUpToast .25s cubic-bezier(.34,1.56,.64,1) both;`;
  el.innerHTML = `
    <span style="font-weight:700;font-size:15px;">${c.icon}</span>
    <span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = "fadeOut .2s ease forwards";
    setTimeout(() => el.remove(), 200);
  }, 3000);
}

// ── Inline field validation ───────────────────────────────────────────────────
export function setFieldError(inputEl, msg) {
  if (!inputEl) return;
  inputEl.style.borderColor = "#ef4444";
  inputEl.style.boxShadow   = "0 0 0 3px rgba(239,68,68,.12)";
  let hint = inputEl.nextElementSibling;
  if (!hint || !hint.classList.contains("field-hint")) {
    hint = document.createElement("span");
    hint.className = "field-hint";
    hint.style.cssText = "font-size:11px;color:#ef4444;display:block;margin-top:3px;";
    inputEl.parentNode.insertBefore(hint, inputEl.nextSibling);
  }
  hint.textContent = msg;
}

export function clearFieldError(inputEl) {
  if (!inputEl) return;
  inputEl.style.borderColor = "";
  inputEl.style.boxShadow   = "";
  const hint = inputEl.nextElementSibling;
  if (hint?.classList.contains("field-hint")) hint.remove();
}

export function validateNumber(inputEl, { min, max, label = "El valor" } = {}) {
  const v = parseFloat(inputEl.value);
  if (isNaN(v)) { setFieldError(inputEl, `${label} debe ser un número`); return false; }
  if (min !== undefined && v < min) { setFieldError(inputEl, `${label} debe ser ≥ ${min}`); return false; }
  if (max !== undefined && v > max) { setFieldError(inputEl, `${label} debe ser ≤ ${max}`); return false; }
  clearFieldError(inputEl); return true;
}

// ── Enter to submit ───────────────────────────────────────────────────────────
export function enterToSubmit(containerId, btnId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById(btnId)?.click();
    }
  });
}

// ── Example pills ─────────────────────────────────────────────────────────────
export function examplePills(examples, onLoad) {
  const id = "ex-" + Math.random().toString(36).slice(2,7);
  setTimeout(() => {
    document.querySelectorAll(`.ex-pill[data-group="${id}"]`).forEach((pill, i) => {
      pill.addEventListener("click", () => {
        onLoad(examples[i].data);
        showToast(`Ejemplo cargado: ${examples[i].label}`, "info");
        // brief active flash
        pill.style.background = "#4f46e5";
        pill.style.color = "white";
        pill.style.borderColor = "#4f46e5";
        setTimeout(() => {
          pill.style.background = "";
          pill.style.color = "";
          pill.style.borderColor = "";
        }, 600);
      });
    });
  }, 50);

  return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
    <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;">
      Ejemplos:
    </span>
    ${examples.map((ex, i) => `
      <button class="ex-pill" data-group="${id}"
        style="font-size:11.5px;font-weight:500;color:var(--brand);
               background:var(--brand-light);border:1.5px solid #c7d2fe;
               border-radius:99px;padding:3px 11px;cursor:pointer;
               font-family:inherit;transition:all .15s;"
        onmouseover="this.style.background='#4f46e5';this.style.color='white';this.style.borderColor='#4f46e5';"
        onmouseout="this.style.background='var(--brand-light)';this.style.color='var(--brand)';this.style.borderColor='#c7d2fe';"
        data-tooltip="${ex.label}">${ex.label}</button>`).join("")}
  </div>`;
}

export function pdfBtn(containerId, filename, titulo) {
  return `<button class="btn btn-pdf" data-pdf="${containerId}"
    onclick="(async()=>{const{exportPDF}=await import('/static/js/utils.js');exportPDF('${containerId}','${filename}','${titulo}');})()">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    Exportar PDF
  </button>`;
}
