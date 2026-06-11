import { post } from "/static/js/api.js";
import { showSpinner, showError, showInterpretacion, renderPasos, sectionCard,
         statCard, primaryBtn, secondaryBtn, pdfBtn, animateNumbers,
         showToast, examplePills } from "/static/js/utils.js";
import { renderFormulacion } from "/static/js/formulacion.js";
import { saveHistory, historyWidget } from "/static/js/history.js";

const EXAMPLES = [
  { label: "Clásico 3×4",
    data: { m:3,n:4,costos:[[2,3,1,4],[5,4,8,1],[5,6,8,2]],oferta:[30,40,50],demanda:[20,30,10,60] } },
  { label: "Simple 2×3",
    data: { m:2,n:3,costos:[[4,8,1],[7,2,3]],oferta:[120,80],demanda:[150,70,80] } },
  { label: "Auto-balanceo",
    data: { m:3,n:3,costos:[[2,7,4],[3,3,1],[5,4,7]],oferta:[70,40,90],demanda:[80,60,50] } },
];

export function render() {
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
    <div id="t-form-col" class="flex-col gap-4">
      ${sectionCard("Dimensiones",`
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Número de fuentes de suministro">Orígenes (m)</label>
            <input id="t-m" type="number" min="2" max="8" value="3" style="width:72px;padding:7px 10px;font-size:13px;"/>
          </div>
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Número de puntos de demanda">Destinos (n)</label>
            <input id="t-n" type="number" min="2" max="8" value="4" style="width:72px;padding:7px 10px;font-size:13px;"/>
          </div>
          ${secondaryBtn("t-gen","Generar tabla")}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div id="t-ex-pills"></div>
          <div id="t-hist-widget"></div>
        </div>
      `)}
      ${sectionCard("Tabla de costos, oferta y demanda",`
        <div id="t-form"></div>
        <div id="t-balance-hint" style="margin-top:6px;"></div>
      `)}
      ${primaryBtn("t-resolver","Resolver")}
    </div>
    <div id="t-resultado">
      <div class="card" style="padding:48px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#cbd5e1;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p style="font-size:13.5px;">Genera la tabla y presiona Resolver</p>
      </div>
    </div>
  </div>`;
}

export function init() {
  document.getElementById("t-ex-pills").innerHTML = examplePills(EXAMPLES, loadExample);
  document.getElementById("t-hist-widget").innerHTML = historyWidget("transporte", loadExample);
  buildForm(3,4);
  document.getElementById("t-gen").addEventListener("click",()=>{
    const m=parseInt(document.getElementById("t-m").value);
    const n=parseInt(document.getElementById("t-n").value);
    if(m<2||m>8||n<2||n>8) return showToast("Entre 2 y 8 orígenes/destinos","error");
    buildForm(m,n);
  });
  document.getElementById("t-resolver").addEventListener("click",resolver);
  document.getElementById("t-form-col").addEventListener("input",checkBalance);
}

function loadExample(data) {
  document.getElementById("t-m").value=data.m; document.getElementById("t-n").value=data.n;
  buildForm(data.m,data.n,data); showToast("Ejemplo cargado","info");
}

function buildForm(m,n,data=null) {
  const def=data||{costos:Array.from({length:m},()=>Array(n).fill(1)),oferta:Array(m).fill(0),demanda:Array(n).fill(0)};
  let html=`<div class="overflow-x"><table class="io-table"><thead><tr>
    <th style="background:var(--bg);">Orig \\ Dest</th>
    ${Array.from({length:n},(_,j)=>`<th>D${j+1}</th>`).join("")}
    <th style="background:#dcfce7;color:#16a34a;" data-tooltip="Cantidad disponible">Oferta</th>
    </tr></thead><tbody>`;
  for(let i=0;i<m;i++){
    html+=`<tr><th style="background:var(--bg);">O${i+1}</th>`;
    for(let j=0;j<n;j++) html+=`<td><input type="number" value="${def.costos[i]?.[j]??1}" min="0"
      class="t-costo" data-i="${i}" data-j="${j}" style="width:52px;padding:4px 6px;font-size:12px;text-align:center;"
      data-tooltip="Costo O${i+1}→D${j+1}"/></td>`;
    html+=`<td style="background:#f0fdf4;"><input type="number" value="${def.oferta?.[i]??0}" min="0"
      class="t-oferta" data-i="${i}" style="width:58px;padding:4px 6px;font-size:12px;text-align:center;"
      data-tooltip="Oferta origen ${i+1}"/></td></tr>`;
  }
  html+=`<tr><th style="background:#dbeafe;color:#1d4ed8;">Demanda</th>`;
  for(let j=0;j<n;j++) html+=`<td style="background:#eff6ff;"><input type="number" value="${def.demanda?.[j]??0}" min="0"
    class="t-demanda" data-j="${j}" style="width:52px;padding:4px 6px;font-size:12px;text-align:center;"
    data-tooltip="Demanda destino ${j+1}"/></td>`;
  html+=`<td></td></tr></tbody></table></div>`;
  document.getElementById("t-form").innerHTML=html; checkBalance();
}

function checkBalance() {
  const O=Array.from(document.querySelectorAll(".t-oferta")).reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  const D=Array.from(document.querySelectorAll(".t-demanda")).reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  const hint=document.getElementById("t-balance-hint"); if(!hint||(!O&&!D)) return (hint.innerHTML="");
  hint.innerHTML=Math.abs(O-D)<1e-8
    ?`<span class="badge badge-green">Balanceado — Oferta = Demanda = ${O}</span>`
    :`<span class="badge badge-amber" data-tooltip="Se agregará origen/destino ficticio con costo 0">
        Desbalanceado — Oferta ${O} ≠ Demanda ${D} · Se auto-balancea
      </span>`;
}

async function resolver() {
  const costoInputs=document.querySelectorAll(".t-costo");
  const ofertaInputs=document.querySelectorAll(".t-oferta");
  const demandaInputs=document.querySelectorAll(".t-demanda");
  const m=ofertaInputs.length,n=demandaInputs.length;
  const costos=Array.from({length:m},()=>Array(n).fill(0));
  const oferta=[],demanda=[];
  for(const inp of costoInputs){const v=parseFloat(inp.value);if(isNaN(v)||v<0)return showToast("Costos inválidos","error");costos[+inp.dataset.i][+inp.dataset.j]=v;}
  for(const inp of ofertaInputs){const v=parseFloat(inp.value);if(isNaN(v)||v<=0)return showToast("Oferta debe ser > 0","error");oferta.push(v);}
  for(const inp of demandaInputs){const v=parseFloat(inp.value);if(isNaN(v)||v<=0)return showToast("Demanda debe ser > 0","error");demanda.push(v);}
  showSpinner("t-resultado");
  try {
    const res=await post("/transporte/resolver",{oferta,demanda,costos});
    if(res.error) return showError("t-resultado",res.error);
    saveHistory("transporte",`Costo = ${res.costo}`,{m,n,costos,oferta,demanda});
    renderResultado(res,costos,m,n); showToast(`Costo mínimo: ${res.costo}`,"success");
  } catch(e){showError("t-resultado",e.message);showToast(e.message,"error");}
}

function renderResultado(res,costos,m,n) {
  let tbl=`<div class="overflow-x"><table class="io-table"><thead><tr><th>Orig\\Dest</th>`;
  for(let j=0;j<n;j++) tbl+=`<th>D${j+1}</th>`;
  tbl+=`</tr></thead><tbody>`;
  for(let i=0;i<m;i++){
    tbl+=`<tr><th style="background:var(--bg);">O${i+1}</th>`;
    for(let j=0;j<n;j++){const v=res.asignacion[i][j],a=v>0;
      tbl+=`<td class="${a?"highlight":""}">${a?v:"—"}<span style="font-size:10px;color:var(--text-muted);display:block;">${costos[i]?.[j]??""}</span></td>`;}
    tbl+=`</tr>`;
  }
  tbl+=`</tbody></table></div>`;
  document.getElementById("t-resultado").innerHTML=`
    <div id="t-pdf-zone" class="flex-col gap-4">
      ${renderFormulacion("transporte",{m,n})}
      ${sectionCard("Resultado",`
        ${statCard("Costo mínimo total",res.costo)}
        ${res.balanceo?`<div class="alert-warn">${res.balanceo}</div>`:""}
        ${showInterpretacion(res.interpretacion)}
        <div style="display:flex;justify-content:flex-end;">${pdfBtn("t-pdf-zone","transporte.pdf","Transporte")}</div>
      `)}
      ${sectionCard("Asignación óptima",tbl)}
      ${sectionCard("Procedimiento (Vogel + MODI)",renderPasos(res.pasos))}
    </div>`;
  animateNumbers("t-resultado");
}
