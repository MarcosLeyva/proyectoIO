import { post } from "/static/js/api.js";
import { showSpinner, showError, showInterpretacion, renderPasos, sectionCard,
         statCard, primaryBtn, secondaryBtn, pdfBtn, animateNumbers,
         showToast, examplePills } from "/static/js/utils.js";
import { renderFormulacion } from "/static/js/formulacion.js";
import { saveHistory, historyWidget } from "/static/js/history.js";

const EXAMPLES = [
  { label: "4×4 clásico",
    data: { n:4, tipo:"min", costos:[[9,2,7,8],[6,4,3,7],[5,8,1,8],[7,6,9,4]] } },
  { label: "3×3 beneficio",
    data: { n:3, tipo:"max", costos:[[9,3,6],[5,9,4],[8,7,9]] } },
  { label: "4×4 trabajos",
    data: { n:4, tipo:"min", costos:[[15,18,21,12],[9,16,17,14],[12,14,18,13],[7,9,11,8]] } },
];

export function render() {
  return `
  <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start;">
    <div id="h-form-col" class="flex-col gap-4">
      ${sectionCard("Configuración",`
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Número de agentes = número de tareas">Tamaño n×n</label>
            <input id="h-n" type="number" min="2" max="8" value="4" style="width:72px;padding:7px 10px;font-size:13px;"/>
          </div>
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Minimizar costo o maximizar beneficio">Criterio</label>
            <select id="h-tipo" style="padding:7px 10px;font-size:13px;">
              <option value="min">Minimizar costo</option>
              <option value="max">Maximizar beneficio</option>
            </select>
          </div>
          ${secondaryBtn("h-gen","Generar")}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div id="h-ex-pills"></div>
          <div id="h-hist-widget"></div>
        </div>
      `)}
      ${sectionCard("Matriz de costos / beneficios",`<div id="h-form"></div>`)}
      ${primaryBtn("h-resolver","Resolver")}
    </div>
    <div id="h-resultado">
      <div class="card" style="padding:48px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#cbd5e1;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style="font-size:13.5px;">Configura la matriz y presiona Resolver</p>
      </div>
    </div>
  </div>`;
}

export function init() {
  document.getElementById("h-ex-pills").innerHTML = examplePills(EXAMPLES, loadExample);
  document.getElementById("h-hist-widget").innerHTML = historyWidget("hungaro", loadExample);
  buildForm(4);
  document.getElementById("h-gen").addEventListener("click",()=>{
    const n=parseInt(document.getElementById("h-n").value);
    if(n<2||n>8) return showToast("Entre 2 y 8","error");
    buildForm(n);
  });
  document.getElementById("h-resolver").addEventListener("click",resolver);
}

function loadExample(data) {
  document.getElementById("h-n").value=data.n; document.getElementById("h-tipo").value=data.tipo;
  buildForm(data.n,data.costos); showToast("Ejemplo cargado","info");
}

function buildForm(n,costos=null) {
  const def=costos||[[9,2,7,8],[6,4,3,7],[5,8,1,8],[7,6,9,4]];
  let html=`<div class="overflow-x"><table class="io-table">
    <thead><tr><th></th>${Array.from({length:n},(_,j)=>`<th data-tooltip="Tarea ${j+1}">T${j+1}</th>`).join("")}</tr></thead>
    <tbody>`;
  for(let i=0;i<n;i++){
    html+=`<tr><th style="background:var(--bg);" data-tooltip="Agente ${i+1}">A${i+1}</th>`;
    for(let j=0;j<n;j++) html+=`<td><input type="number" value="${def[i]?.[j]??1}"
      class="h-cell" data-i="${i}" data-j="${j}"
      style="width:52px;padding:4px 6px;font-size:12px;text-align:center;"
      data-tooltip="Costo/Beneficio A${i+1}→T${j+1}"/></td>`;
    html+=`</tr>`;
  }
  html+=`</tbody></table></div>`;
  document.getElementById("h-form").innerHTML=html;
}

async function resolver() {
  const n=parseInt(document.getElementById("h-n").value);
  const tipo=document.getElementById("h-tipo").value;
  const costos=Array.from({length:n},()=>Array(n).fill(0));
  for(const inp of document.querySelectorAll(".h-cell")){
    const v=parseFloat(inp.value);
    if(isNaN(v)) return showToast("Todos los valores deben ser números","error");
    costos[+inp.dataset.i][+inp.dataset.j]=v;
  }
  showSpinner("h-resultado");
  try {
    const res=await post("/hungaro/resolver",{costos,tipo});
    if(res.error) return showError("h-resultado",res.error);
    saveHistory("hungaro",`${tipo==="min"?"Costo":"Beneficio"} = ${res.costo_total}`,{n,tipo,costos});
    renderResultado(res,n,costos); showToast(`${tipo==="min"?"Costo mínimo":"Beneficio máximo"}: ${res.costo_total}`,"success");
  } catch(e){showError("h-resultado",e.message);showToast(e.message,"error");}
}

function renderResultado(res,n,costos) {
  const asigSet=new Set(res.asignacion.map(([i,j])=>`${i},${j}`));
  let tbl=`<div class="overflow-x"><table class="io-table">
    <thead><tr><th></th>${Array.from({length:n},(_,j)=>`<th>T${j+1}</th>`).join("")}</tr></thead><tbody>`;
  for(let i=0;i<n;i++){
    tbl+=`<tr><th style="background:var(--bg);">A${i+1}</th>`;
    for(let j=0;j<n;j++){const sel=asigSet.has(`${i},${j}`);
      tbl+=`<td class="${sel?"highlight":""}">${costos[i]?.[j]??""}${sel?`<span style="font-size:10px;display:block;">✓</span>`:""}</td>`;}
    tbl+=`</tr>`;
  }
  tbl+=`</tbody></table></div>`;
  document.getElementById("h-resultado").innerHTML=`
    <div id="h-pdf-zone" class="flex-col gap-4">
      ${renderFormulacion("asignacion",{n,tipo:res.tipo})}
      ${sectionCard("Resultado",`
        ${statCard(res.tipo==="min"?"Costo mínimo":"Beneficio máximo",res.costo_total)}
        ${tbl}
        ${showInterpretacion(res.interpretacion)}
        <div style="display:flex;justify-content:flex-end;">${pdfBtn("h-pdf-zone","asignacion.pdf","Asignación")}</div>
      `)}
      ${sectionCard("Procedimiento (Método Húngaro)",renderPasos(res.pasos))}
    </div>`;
  animateNumbers("h-resultado");
}
