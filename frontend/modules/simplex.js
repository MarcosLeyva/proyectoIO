import { post } from "/static/js/api.js";
import { showSpinner, showError, showInterpretacion, sectionCard, statCard,
         primaryBtn, secondaryBtn, pdfBtn, animateNumbers,
         showToast, examplePills, enterToSubmit } from "/static/js/utils.js";
import { renderFormulacion } from "/static/js/formulacion.js";
import { saveHistory, historyWidget } from "/static/js/history.js";

const EXAMPLES = [
  { label: "2 variables",
    data: { nvars:2, tipo:"max", obj:[5,4], rows:[{coefs:[6,4],op:"<=",rhs:24},{coefs:[1,2],op:"<=",rhs:6}] } },
  { label: "3 variables",
    data: { nvars:3, tipo:"max", obj:[2,3,4], rows:[{coefs:[3,2,1],op:"<=",rhs:14},{coefs:[2,5,3],op:"<=",rhs:14},{coefs:[1,1,1],op:"<=",rhs:5}] } },
  { label: "Gran M (≥)",
    data: { nvars:2, tipo:"min", obj:[2,3], rows:[{coefs:[1,1],op:">=",rhs:4},{coefs:[3,1],op:">=",rhs:6}] } },
];

let _pasos=[], _step=0, _playing=false, _playTimer=null, _nv=2;

export function render() {
  return `
  <div style="display:grid;grid-template-columns:380px 1fr;gap:20px;align-items:start;">
    <div id="s-form-col" class="flex-col gap-4">
      ${sectionCard("Configuración",`
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Número de variables de decisión (x₁, x₂, ...)">N° Variables</label>
            <input id="s-nvars" type="number" min="2" max="8" value="2" style="width:72px;padding:7px 10px;font-size:13px;"/>
          </div>
          <div class="flex-col" style="gap:4px;">
            <label class="label">Objetivo</label>
            <select id="s-tipo" style="padding:7px 10px;font-size:13px;">
              <option value="max">Maximizar</option>
              <option value="min">Minimizar</option>
            </select>
          </div>
          ${secondaryBtn("s-gen-form","Generar")}
        </div>
        <div id="s-ex-pills"></div>
      `)}
      <div id="s-form-wrap" class="flex-col gap-4"></div>
      <div id="s-btn-wrap"></div>
    </div>
    <div id="s-resultado">
      <div class="card" style="padding:48px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#cbd5e1;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>
        </svg>
        <p style="font-size:13.5px;">Configura el problema y presiona Resolver</p>
      </div>
    </div>
  </div>`;
}

export function init() {
  _pasos=[]; _step=0; _playing=false; clearInterval(_playTimer);

  document.getElementById("s-ex-pills").innerHTML = examplePills(EXAMPLES, loadExample);

  buildForm(2);

  document.getElementById("s-gen-form").addEventListener("click",()=>{
    const n=parseInt(document.getElementById("s-nvars").value)||2;
    if(n<2||n>8) return showToast("Entre 2 y 8 variables","error");
    buildForm(n);
  });

  document.addEventListener("click",e=>{
    if (e.target?.id==="s-add-rest") addRestriccion(_nv);
    if (e.target?.classList?.contains("s-remove-rest")){
      const row=e.target.closest(".s-rest-row");
      row.style.opacity="0"; row.style.transition="opacity .15s";
      setTimeout(()=>row.remove(),150);
    }
    if (e.target?.id==="s-resolver") doResolve(_nv);
    if (e.target?.id==="s-step-prev") setStep(_step-1);
    if (e.target?.id==="s-step-next") setStep(_step+1);
    if (e.target?.id==="s-step-play") togglePlay();
    if (e.target?.id==="s-step-first") setStep(0);
    if (e.target?.id==="s-step-last") setStep(_pasos.length-1);
  });

  enterToSubmit("s-form-col","s-resolver");
}

function loadExample(data) {
  document.getElementById("s-nvars").value = data.nvars;
  document.getElementById("s-tipo").value  = data.tipo;
  buildForm(data.nvars, data);
  showToast("Ejemplo cargado","info");
}

function buildForm(n, data=null) {
  _nv=n;
  const vars=Array.from({length:n},(_,i)=>`x${i+1}`);
  document.getElementById("s-form-wrap").innerHTML=`
    ${sectionCard("Función objetivo: Z =",`
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;">
        ${vars.map((v,i)=>`
          <div class="flex-col" style="gap:3px;">
            <label style="font-size:11px;color:var(--text-muted);" data-tooltip="Coeficiente de ${v}">${v}</label>
            <div style="display:flex;align-items:center;gap:4px;">
              <input id="s-obj-${i}" type="number" value="${data?.obj[i]??( i===0?5:4)}"
                style="width:60px;padding:6px 8px;font-size:13px;"/>
              ${i<n-1?'<span style="font-size:13px;color:var(--text-muted);">+</span>':''}
            </div>
          </div>`).join("")}
      </div>
    `)}
    ${sectionCard("Restricciones",`
      <div id="s-restricciones" class="flex-col" style="gap:6px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        ${secondaryBtn("s-add-rest","+ Agregar restricción")}
        <div id="s-hist-widget"></div>
      </div>
    `)}`;

  document.getElementById("s-btn-wrap").innerHTML=primaryBtn("s-resolver","Resolver");
  document.getElementById("s-hist-widget").innerHTML=historyWidget("simplex", loadFromHistory);

  const defRows = data?.rows || [{coefs:Array(n).fill(0).map((_,i)=>i===0?6:4),op:"<=",rhs:24},
                                  {coefs:Array(n).fill(0).map((_,i)=>i===0?1:2),op:"<=",rhs:6}];
  defRows.forEach(r=>addRestriccion(n,r.coefs,r.op,r.rhs));
}

function loadFromHistory(input) {
  document.getElementById("s-nvars").value = input.nvars;
  document.getElementById("s-tipo").value  = input.tipo;
  buildForm(input.nvars, input);
}

function addRestriccion(n, vals=null, op="<=", rhs=0) {
  const c=document.getElementById("s-restricciones"); if(!c) return;
  const vars=Array.from({length:n},(_,i)=>`x${i+1}`);
  const div=document.createElement("div");
  div.className="s-rest-row";
  div.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border-soft);";
  div.innerHTML=`
    ${vars.map((v,i)=>`
      <input type="number" value="${vals?vals[i]??0:0}" class="s-rest-coef"
        style="width:56px;padding:6px 8px;font-size:13px;" data-tooltip="${v}"/>
      <span style="font-size:12px;color:var(--text-muted);">${v}${i<n-1?" +":""}</span>`).join("")}
    <select class="s-rest-op" style="padding:6px 8px;font-size:13px;" data-tooltip="Tipo de restricción">
      <option ${op==="<="?"selected":""}><=</option>
      <option ${op===">="?"selected":""}>&gt;=</option>
      <option ${op==="="?"selected":""}>=</option>
    </select>
    <input type="number" value="${rhs}" class="s-rest-rhs" style="width:72px;padding:6px 8px;font-size:13px;" data-tooltip="Lado derecho"/>
    <button class="s-remove-rest btn btn-ghost" data-tooltip="Eliminar restricción">×</button>`;
  c.appendChild(div);
}

async function doResolve(n) {
  const tipo=document.getElementById("s-tipo").value;
  const obj=[...document.querySelectorAll("[id^='s-obj-']")].map(i=>parseFloat(i.value));
  if(obj.some(isNaN)) return showToast("Coeficientes de función objetivo inválidos","error");
  const restricciones=[];
  for (const row of document.querySelectorAll(".s-rest-row")){
    const coefs=[...row.querySelectorAll(".s-rest-coef")].map(i=>parseFloat(i.value));
    const op=row.querySelector(".s-rest-op").value;
    const rhs=parseFloat(row.querySelector(".s-rest-rhs").value);
    if(coefs.some(isNaN)||isNaN(rhs)) return showToast("Valores inválidos en restricciones","error");
    restricciones.push({coefs,op,rhs});
  }
  if(!restricciones.length) return showToast("Agrega al menos una restricción","error");
  showSpinner("s-resultado");
  try {
    const res=await post("/simplex/resolver",{obj,restricciones,tipo});
    if(res.error) return showError("s-resultado",res.error);
    const label=`Z=${res.z} · ${Object.entries(res.solucion).map(([k,v])=>`${k}=${v}`).join(", ")}`;
    saveHistory("simplex",label,{nvars:n,tipo,obj,rows:restricciones});
    renderResultado(res, obj, restricciones, tipo);
    showToast("Solución óptima encontrada","success");
  } catch(e){ showError("s-resultado",e.message); showToast(e.message,"error"); }
}

function renderResultado(res, obj, restricciones, tipo) {
  _pasos=res.pasos||[]; _step=0;
  document.getElementById("s-resultado").innerHTML=`
    <div id="s-pdf-zone" class="flex-col gap-4">
      ${renderFormulacion("pl",{obj,restricciones,tipo})}
      ${sectionCard("Solución óptima",`
        <div class="flex-row gap-3 wrap">
          ${Object.entries(res.solucion).map(([k,v])=>statCard(k,v)).join("")}
          ${statCard("Z "+(res.tipo==="max"?"(máx)":"(mín)"),res.z)}
        </div>
        <p style="font-size:12px;color:var(--text-muted);">Convergió en ${res.iteraciones} iteración(es)</p>
        ${showInterpretacion(res.interpretacion)}
        <div style="display:flex;justify-content:flex-end;">${pdfBtn("s-pdf-zone","simplex.pdf","Método Simplex")}</div>
      `)}
      ${sectionCard("Iteraciones — paso a paso",`
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;">
          <button id="s-step-first" class="btn btn-ctrl" data-tooltip="Primera iteración">⏮</button>
          <button id="s-step-prev"  class="btn btn-ctrl" data-tooltip="Iteración anterior">◀</button>
          <button id="s-step-play"  class="btn btn-play">▶ Reproducir</button>
          <button id="s-step-next"  class="btn btn-ctrl" data-tooltip="Siguiente iteración">▶</button>
          <button id="s-step-last"  class="btn btn-ctrl" data-tooltip="Última iteración">⏭</button>
          <span id="s-step-counter" style="font-size:12px;color:var(--text-muted);margin-left:4px;"></span>
        </div>
        <div id="s-tableau-view"></div>
      `)}
    </div>`;
  animateNumbers("s-resultado");
  renderStep();
}

function setStep(n){_step=Math.max(0,Math.min(n,_pasos.length-1));renderStep();}

function togglePlay(){
  const btn=document.getElementById("s-step-play"); if(!btn) return;
  _playing=!_playing;
  btn.textContent=_playing?"⏸ Pausar":"▶ Reproducir";
  if(_playing){
    _playTimer=setInterval(()=>{
      if(_step>=_pasos.length-1){_playing=false;clearInterval(_playTimer);if(btn)btn.textContent="▶ Reproducir";}
      else setStep(_step+1);
    },900);
  } else clearInterval(_playTimer);
}

function renderStep(){
  const view=document.getElementById("s-tableau-view");
  const counter=document.getElementById("s-step-counter");
  if(!view||!_pasos.length) return;
  counter.textContent=`Iteración ${_step} de ${_pasos.length-1}`;
  const p=_pasos[_step];
  const nCols=p.tableau[0]?.length||0;
  const zr=p.z_row.slice(0,-1);
  const pivCol=zr.indexOf(Math.min(...zr));
  const pivRow=p.tableau.reduce((best,row,i)=>{
    const el=row[pivCol]; if(el<=1e-8) return best;
    const ratio=row[row.length-1]/el;
    if(best===-1) return i;
    const br=p.tableau[best][p.tableau[best].length-1]/p.tableau[best][pivCol];
    return ratio<br?i:best;
  },-1);
  const isOpt=zr.every(v=>v>=-1e-8);
  view.style.opacity="0";
  setTimeout(()=>{
    view.innerHTML=`
      <div class="overflow-x">
        <table class="io-table" style="font-size:12px;">
          <thead><tr>
            <th style="background:#1e293b;">Base</th>
            ${Array.from({length:nCols-1},(_,j)=>`<th class="${j===pivCol&&!isOpt?"pivot-col":""}"
              style="${j===pivCol&&!isOpt?"background:var(--brand);color:white;":""}">col ${j+1}</th>`).join("")}
            <th style="background:#1e293b;">RHS</th>
          </tr></thead>
          <tbody>
            ${p.tableau.map((row,i)=>`
              <tr style="${i===pivRow&&!isOpt?"background:#fff7ed;":""}">
                <td style="font-weight:600;color:var(--brand);background:var(--bg);">${p.base[i]??""}</td>
                ${row.map((v,j)=>`<td class="${i===pivRow&&j===pivCol&&!isOpt?"pivot-cell":j===pivCol&&i!==pivRow&&!isOpt?"pivot-col":""}">${v}</td>`).join("")}
              </tr>`).join("")}
            <tr style="background:#fffbeb;">
              <td style="font-weight:600;color:#92400e;background:#fef3c7;">Z</td>
              ${p.z_row.map(v=>`<td style="font-weight:600;color:${v<-1e-8?"#dc2626":"inherit"}">${v}</td>`).join("")}
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        ${!isOpt&&pivCol>=0?`<span class="badge badge-blue">Entra: col ${pivCol+1}</span>`:""}
        ${!isOpt&&pivRow>=0?`<span class="badge badge-amber">Sale: ${p.base[pivRow]??""}</span>`:""}
        ${isOpt?`<span class="badge badge-green">Solución óptima</span>`:""}
      </div>`;
    view.style.opacity="1"; view.style.transition="opacity .2s";
  },80);
}
