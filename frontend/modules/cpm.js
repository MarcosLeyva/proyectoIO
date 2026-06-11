import { post } from "/static/js/api.js";
import { showSpinner, showError, showInterpretacion, sectionCard, statCard, primaryBtn, secondaryBtn, pdfBtn, animateNumbers, showToast, examplePills } from "/static/js/utils.js";
import { renderFormulacion } from "/static/js/formulacion.js";
import { saveHistory, historyWidget } from "/static/js/history.js";

const EXAMPLES = [
  { label: "Proyecto SW",
    data: [{id:"A",nombre:"Requisitos",preds:"",dur:3},{id:"B",nombre:"Diseño",preds:"A",dur:4},{id:"C",nombre:"Backend",preds:"B",dur:6},{id:"D",nombre:"Frontend",preds:"B",dur:5},{id:"E",nombre:"Pruebas",preds:"C,D",dur:3},{id:"F",nombre:"Deploy",preds:"E",dur:2}] },
  { label: "Construcción",
    data: [{id:"A",nombre:"Cimientos",preds:"",dur:8},{id:"B",nombre:"Estructura",preds:"A",dur:12},{id:"C",nombre:"Paredes",preds:"B",dur:6},{id:"D",nombre:"Instalaciones",preds:"B",dur:5},{id:"E",nombre:"Acabados",preds:"C,D",dur:7}] },
  { label: "Evento",
    data: [{id:"A",nombre:"Planificación",preds:"",dur:5},{id:"B",nombre:"Logística",preds:"A",dur:3},{id:"C",nombre:"Invitaciones",preds:"A",dur:2},{id:"D",nombre:"Catering",preds:"B",dur:4},{id:"E",nombre:"Decoración",preds:"B,C",dur:3},{id:"F",nombre:"Ejecución",preds:"D,E",dur:1}] },
];

const DEFAULTS = [
  {id:"A",nombre:"Diseño",       preds:"",   dur:4},
  {id:"B",nombre:"Desarrollo",   preds:"A",  dur:6},
  {id:"C",nombre:"Pruebas",      preds:"A",  dur:3},
  {id:"D",nombre:"Documentación",preds:"B",  dur:2},
  {id:"E",nombre:"Despliegue",   preds:"C,D",dur:5},
];

export function render() {
  return `
  <div style="display:grid;grid-template-columns:380px 1fr;gap:20px;align-items:start;">
    <div id="c-form-col" class="flex-col gap-4">
      ${sectionCard("Modo de análisis", `
        <select id="c-modo" style="padding:7px 10px;font-size:13px;width:100%;"
          data-tooltip="CPM usa duración fija · PERT usa tiempos optimista/probable/pesimista">
          <option value="cpm">CPM — Duración determinista</option>
          <option value="pert">PERT — Tiempos probabilísticos</option>
        </select>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div id="c-ex-pills"></div>
          <div id="c-hist-widget"></div>
        </div>
      `)}
      ${sectionCard("Actividades", `
        <div id="c-actividades" style="display:flex;flex-direction:column;gap:6px;"></div>
        ${secondaryBtn("c-add","+ Agregar actividad")}
      `)}
      ${primaryBtn("c-resolver","Resolver")}
    </div>
    <div id="c-resultado">
      <div class="card" style="padding:48px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#cbd5e1;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <p style="font-size:13.5px;">Define las actividades y presiona Resolver</p>
      </div>
    </div>
  </div>`;
}

export function init() {
  document.getElementById("c-ex-pills").innerHTML = examplePills(EXAMPLES, loadExample);
  document.getElementById("c-hist-widget").innerHTML = historyWidget("cpm", loadExample);

  DEFAULTS.forEach(d => addActividad(d));
  document.getElementById("c-add").addEventListener("click", () => addActividad());
  document.getElementById("c-resolver").addEventListener("click", resolver);
  document.getElementById("c-modo").addEventListener("change", toggleModo);
  toggleModo();
}

function loadExample(acts) {
  document.getElementById("c-actividades").innerHTML = "";
  acts.forEach(a => addActividad(a));
  showToast("Ejemplo cargado","info");
}

function toggleModo() {
  const modo = document.getElementById("c-modo").value;
  document.querySelectorAll(".c-dur").forEach(el => el.style.display = modo==="cpm"?"flex":"none");
  document.querySelectorAll(".c-pert").forEach(el => el.style.display = modo==="pert"?"flex":"none");
}

function addActividad(def=null) {
  const isNew = !def;
  const div = document.createElement("div");
  div.className = "c-act-row";
  div.style.cssText = [
    "display:flex;align-items:center;gap:6px;flex-wrap:wrap;",
    "padding:7px 8px;border-radius:6px;",
    "border:1.5px solid;transition:border-color .4s,background .4s;",
    isNew
      ? "background:#eef2ff;border-color:#4f46e5;"   // nueva: resaltada
      : "background:#f8fafc;border-color:#e2e8f0;"   // default: cargada
  ].join("");

  div.innerHTML = `
    <input type="text" placeholder="ID" value="${def?.id??""}" maxlength="4"
      class="c-id" style="width:44px;padding:5px 6px;font-size:12px;font-weight:700;
        text-transform:uppercase;text-align:center;" />
    <input type="text" placeholder="Nombre de la actividad" value="${def?.nombre??""}"
      class="c-nombre" style="width:140px;padding:5px 8px;font-size:12px;" />
    <input type="text" placeholder="Predecesoras: A,B" value="${def?.preds??""}"
      class="c-preds" style="width:110px;padding:5px 8px;font-size:12px;" />
    <span class="c-dur" style="display:flex;align-items:center;gap:4px;">
      <label style="font-size:11px;color:var(--text-muted);">Duración</label>
      <input type="number" value="${def?.dur??1}" min="0" class="c-duracion"
        style="width:56px;padding:5px 6px;font-size:12px;" />
    </span>
    <span class="c-pert" style="display:none;align-items:center;gap:4px;flex-wrap:wrap;">
      <label style="font-size:10.5px;color:var(--text-muted);">Opt.</label>
      <input type="number" value="${def?.dur?Math.round(def.dur*.7):1}" class="c-opt"
        style="width:46px;padding:4px 5px;font-size:11.5px;" title="Tiempo optimista"/>
      <label style="font-size:10.5px;color:var(--text-muted);">Prob.</label>
      <input type="number" value="${def?.dur??3}" class="c-prob"
        style="width:46px;padding:4px 5px;font-size:11.5px;" title="Tiempo más probable"/>
      <label style="font-size:10.5px;color:var(--text-muted);">Pes.</label>
      <input type="number" value="${def?.dur?Math.round(def.dur*1.4):5}" class="c-pes"
        style="width:46px;padding:4px 5px;font-size:11.5px;" title="Tiempo pesimista"/>
    </span>
    <button class="btn btn-ghost" style="margin-left:auto;" title="Eliminar actividad">×</button>`;

  div.querySelector("button").addEventListener("click", () => {
    div.style.opacity = "0";
    div.style.transform = "translateX(8px)";
    div.style.transition = "opacity .2s,transform .2s";
    setTimeout(() => div.remove(), 200);
  });

  // Quitar resaltado después de 1.5s en filas nuevas
  if (isNew) {
    setTimeout(() => {
      div.style.background = "#f8fafc";
      div.style.borderColor = "#e2e8f0";
    }, 1500);
  }

  const container = document.getElementById("c-actividades");
  container.appendChild(div);
  toggleModo();

  // Scroll suave + foco en el campo ID si es nueva
  if (isNew) {
    div.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => div.querySelector(".c-id")?.focus(), 80);
  }
}

async function resolver() {
  const modo = document.getElementById("c-modo").value;
  const rows = document.querySelectorAll(".c-act-row");
  const actividades = [];
  for (const row of rows) {
    const id = row.querySelector(".c-id").value.trim().toUpperCase();
    const nombre = row.querySelector(".c-nombre").value.trim() || id;
    const predsStr = row.querySelector(".c-preds").value.trim();
    const predecesoras = predsStr ? predsStr.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean) : [];
    if (!id) return showError("c-resultado","Todas las actividades deben tener un ID.");
    const act = {id, nombre, predecesoras};
    if (modo==="cpm") {
      const dur = parseFloat(row.querySelector(".c-duracion").value);
      if (isNaN(dur)||dur<0) return showError("c-resultado",`Duración inválida en ${id}.`);
      act.duracion = dur;
    } else {
      const o=parseFloat(row.querySelector(".c-opt").value);
      const m=parseFloat(row.querySelector(".c-prob").value);
      const p=parseFloat(row.querySelector(".c-pes").value);
      if ([o,m,p].some(isNaN)) return showError("c-resultado",`Tiempos PERT inválidos en ${id}.`);
      if (o>m||m>p) return showError("c-resultado",`En ${id}: debe cumplirse O ≤ M ≤ P.`);
      act.optimista=o; act.probable=m; act.pesimista=p;
    }
    actividades.push(act);
  }
  if (!actividades.length) return showToast("Agrega al menos una actividad","error");
  showSpinner("c-resultado");
  try {
    const res = await post("/cpm/resolver",{actividades,modo});
    if (res.error) return showError("c-resultado",res.error);
    saveHistory("cpm",`Duración: ${res.duracion_proyecto} · Ruta: ${res.ruta_critica.join("→")}`, actividades);
    renderResultado(res, actividades, modo);
    showToast(`Ruta crítica: ${res.ruta_critica.join(" → ")}`,"success");
  } catch(e) { showError("c-resultado",e.message); showToast(e.message,"error"); }
}

function renderResultado(res, actividades, modo) {

  const headers = ["ID","Nombre","Dur","ES","EF","LS","LF","Holgura"];
  const tblHtml = `<div class="overflow-x"><table class="io-table">
    <thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${res.nodos.map(n=>`
      <tr style="${n.critica?"background:#fff1f2;":""}">
        <td style="font-weight:700;font-family:monospace;">${n.id}</td>
        <td style="text-align:left;">${n.nombre}</td>
        <td>${n.duracion}</td><td>${n.ES}</td><td>${n.EF}</td>
        <td>${n.LS}</td><td>${n.LF}</td>
        <td style="font-weight:700;color:${n.critica?"#dc2626":"#16a34a"};">${n.holgura}</td>
      </tr>`).join("")}
    </tbody>
  </table></div>`;

  // Canvas heights
  const nAct = res.nodos.length;
  const ganttH = Math.max(180, nAct * 38 + 50);

  document.getElementById("c-resultado").innerHTML = `
    <div id="c-pdf-zone" class="flex-col gap-4">
      ${renderFormulacion("cpm",{actividades,modo})}
      ${sectionCard("Resultado", `
        <div class="flex-row gap-3 wrap">
          ${statCard("Duración total", res.duracion_proyecto, "unidades de tiempo")}
          <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;min-width:200px;">
            <p style="font-size:11.5px;color:#94a3b8;font-weight:500;">Ruta crítica</p>
            <p style="font-size:15px;font-weight:700;color:#dc2626;line-height:1.4;">${res.ruta_critica.join(" → ")}</p>
          </div>
          ${res.desv_proyecto>0?statCard("σ proyecto (PERT)", res.desv_proyecto):""}
        </div>
        ${showInterpretacion(res.interpretacion)}
        <div style="display:flex;justify-content:flex-end;">${pdfBtn("c-pdf-zone","cpm-pert.pdf","CPM / PERT")}</div>
      `)}

      ${sectionCard("Diagrama de Gantt", `
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;font-size:12px;color:#64748b;">
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <span style="width:12px;height:12px;background:#4f46e5;border-radius:2px;display:inline-block;"></span> Actividad (ES→EF)
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <span style="width:12px;height:12px;background:#cbd5e1;border-radius:2px;display:inline-block;"></span> Flotación (EF→LF)
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <span style="width:12px;height:12px;background:#dc2626;border-radius:2px;display:inline-block;"></span> Ruta crítica
          </span>
        </div>
        <canvas id="c-gantt" width="700" height="${ganttH}" style="width:100%;border-radius:6px;border:1px solid #f1f5f9;"></canvas>
      `)}

      ${sectionCard("Diagrama de red", `
        <canvas id="c-canvas" width="640" height="260" style="width:100%;border-radius:6px;border:1px solid #f1f5f9;"></canvas>
      `)}

      ${sectionCard("Tabla de actividades", tblHtml)}
    </div>`;

  animateNumbers("c-resultado");
  requestAnimationFrame(() => {
    drawNetwork(res);
    drawGantt(res);
  });
}

// ── GANTT CHART ──────────────────────────────────────────────────────────────
function drawGantt(res) {
  const canvas = document.getElementById("c-gantt");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const LEFT = 110, TOP = 28, BOTTOM = 28;
  const chartW = W - LEFT - 20;
  const rowH = (H - TOP - BOTTOM) / res.nodos.length;
  const dur = res.duracion_proyecto;
  const critSet = new Set(res.ruta_critica);

  ctx.fillStyle = "#f8fafc"; ctx.fillRect(0,0,W,H);

  // Grid vertical lines + time labels
  const ticks = Math.min(dur, 12);
  const step = Math.ceil(dur / ticks);
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
  for (let t = 0; t <= dur; t += step) {
    const x = LEFT + (t / dur) * chartW;
    ctx.beginPath(); ctx.moveTo(x, TOP-6); ctx.lineTo(x, H-BOTTOM); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(t, x, TOP-8);
  }

  // Time axis label
  ctx.fillStyle = "#475569"; ctx.font = "11px Inter,sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Tiempo", LEFT + chartW/2, H - 8);

  // Rows
  res.nodos.forEach((n, i) => {
    const y = TOP + i * rowH;
    const isCrit = critSet.has(n.id);
    const barColor  = isCrit ? "#dc2626" : "#4f46e5";
    const floatColor = isCrit ? "#fca5a5" : "#cbd5e1";

    // Row background (alternating)
    ctx.fillStyle = i % 2 === 0 ? "#f8fafc" : "white";
    ctx.fillRect(LEFT, y, chartW, rowH);

    // Float bar (EF → LF)
    if (n.LF > n.EF) {
      const xFloat = LEFT + (n.EF / dur) * chartW;
      const wFloat = ((n.LF - n.EF) / dur) * chartW;
      ctx.fillStyle = floatColor;
      ctx.beginPath();
      ctx.roundRect(xFloat, y + rowH*0.3, wFloat, rowH*0.4, 2);
      ctx.fill();
    }

    // Activity bar (ES → EF)
    const xBar = LEFT + (n.ES / dur) * chartW;
    const wBar = Math.max(((n.EF - n.ES) / dur) * chartW, 4);
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(xBar, y + rowH*0.2, wBar, rowH*0.6, 3);
    ctx.fill();

    // Duration label inside bar
    if (wBar > 28) {
      ctx.fillStyle = "white"; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(n.duracion, xBar + wBar/2, y + rowH*0.2 + rowH*0.6/2 + 3.5);
    }

    // Activity name (left)
    ctx.fillStyle = isCrit ? "#dc2626" : "#334155";
    ctx.font = (isCrit ? "bold " : "") + "11.5px Inter,sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${n.id} – ${n.nombre}`, LEFT - 6, y + rowH/2 + 4);

    // Row separator
    ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LEFT, y + rowH); ctx.lineTo(W-10, y + rowH); ctx.stroke();
  });

  // Border
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5;
  ctx.strokeRect(LEFT, TOP, chartW, H - TOP - BOTTOM);
}

// ── NETWORK DIAGRAM ──────────────────────────────────────────────────────────
function drawNetwork(res) {
  const canvas = document.getElementById("c-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W=canvas.width, H=canvas.height;
  ctx.fillStyle="#f8fafc"; ctx.fillRect(0,0,W,H);

  const levels={};
  function getLevel(id) {
    if (levels[id]!==undefined) return levels[id];
    const preds=res.edges.filter(e=>e.to===id).map(e=>e.from);
    if (!preds.length){levels[id]=0;return 0;}
    levels[id]=Math.max(...preds.map(p=>getLevel(p)))+1;
    return levels[id];
  }
  res.nodos.forEach(n=>getLevel(n.id));
  const maxLevel=Math.max(...Object.values(levels));
  const levelGroups={};
  res.nodos.forEach(n=>{const l=levels[n.id];if(!levelGroups[l])levelGroups[l]=[];levelGroups[l].push(n.id);});

  const PAD=40;
  const positions={};
  const levelW=(W-PAD*2)/(maxLevel+1);
  Object.entries(levelGroups).forEach(([l,ids])=>{
    const x=PAD+parseInt(l)*levelW+levelW/2;
    ids.forEach((id,idx)=>{
      const y=PAD+(idx+1)*(H-PAD*2)/(ids.length+1);
      positions[id]={x,y};
    });
  });

  const critSet=new Set(res.ruta_critica);
  const R=19;

  res.edges.forEach(e=>{
    const from=positions[e.from],to=positions[e.to]; if(!from||!to) return;
    const isCrit=critSet.has(e.from)&&critSet.has(e.to);
    ctx.strokeStyle=isCrit?"#4f46e5":"#cbd5e1";
    ctx.lineWidth=isCrit?2.5:1.5;
    ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
    const angle=Math.atan2(to.y-from.y,to.x-from.x);
    const ax=to.x-(R+4)*Math.cos(angle), ay=to.y-(R+4)*Math.sin(angle);
    ctx.fillStyle=isCrit?"#4f46e5":"#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(ax,ay);
    ctx.lineTo(ax-7*Math.cos(angle-.4),ay-7*Math.sin(angle-.4));
    ctx.lineTo(ax-7*Math.cos(angle+.4),ay-7*Math.sin(angle+.4));
    ctx.closePath(); ctx.fill();
  });

  res.nodos.forEach(n=>{
    const p=positions[n.id]; if(!p) return;
    const isCrit=critSet.has(n.id);
    ctx.fillStyle=isCrit?"#4f46e5":"white";
    ctx.strokeStyle=isCrit?"#4f46e5":"#cbd5e1";
    ctx.lineWidth=isCrit?2:1.5;
    ctx.beginPath(); ctx.arc(p.x,p.y,R,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle=isCrit?"white":"#334155";
    ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(n.id,p.x,p.y);
    ctx.font="9.5px Inter,sans-serif"; ctx.textBaseline="alphabetic";
    ctx.fillStyle="#64748b";
    ctx.fillText(`${n.ES}|${n.EF}`,p.x,p.y+R+12);
  });
}
