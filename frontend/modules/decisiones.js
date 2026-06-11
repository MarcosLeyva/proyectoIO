import { post } from "/static/js/api.js";
import { showSpinner, showError, showInterpretacion, renderPasos, sectionCard,
         statCard, primaryBtn, secondaryBtn, pdfBtn, animateNumbers,
         showToast, examplePills } from "/static/js/utils.js";
import { renderFormulacion } from "/static/js/formulacion.js";
import { saveHistory, historyWidget } from "/static/js/history.js";

const EXAMPLES = [
  { label: "Inversiones",
    data: { na:3,ne:3,tipo:"max",
            alternativas:["Inversión A","Inversión B","Inversión C"],
            estados:["Demanda Alta","Demanda Media","Demanda Baja"],
            matriz:[[200,100,-50],[150,150,0],[100,100,100]], probs:["0.3","0.5","0.2"] } },
  { label: "Cosecha",
    data: { na:3,ne:3,tipo:"max",
            alternativas:["Plantar maíz","Plantar trigo","No plantar"],
            estados:["Lluvias altas","Lluvias medias","Sequía"],
            matriz:[[80,60,20],[70,55,30],[40,40,40]], probs:["","",""] } },
  { label: "Estrategia empresa",
    data: { na:4,ne:3,tipo:"max",
            alternativas:["Expandir","Mantener","Reducir","Salir"],
            estados:["Auge","Normal","Recesión"],
            matriz:[[100,40,-20],[50,50,30],[10,10,10],[-10,20,40]], probs:["0.4","0.4","0.2"] } },
];

export function render() {
  return `
  <div style="display:grid;grid-template-columns:420px 1fr;gap:20px;align-items:start;">
    <div id="d-form-col" class="flex-col gap-4">
      ${sectionCard("Configuración",`
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Número de cursos de acción posibles">Alternativas</label>
            <input id="d-na" type="number" min="2" max="8" value="3" style="width:72px;padding:7px 10px;font-size:13px;"/>
          </div>
          <div class="flex-col" style="gap:4px;">
            <label class="label" data-tooltip="Escenarios que no controla el decisor">Estados de naturaleza</label>
            <input id="d-ne" type="number" min="2" max="8" value="3" style="width:72px;padding:7px 10px;font-size:13px;"/>
          </div>
          <div class="flex-col" style="gap:4px;">
            <label class="label">Tipo</label>
            <select id="d-tipo" style="padding:7px 10px;font-size:13px;">
              <option value="max">Beneficio (MAX)</option>
              <option value="min">Costo (MIN)</option>
            </select>
          </div>
          ${secondaryBtn("d-gen","Generar")}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <label class="label" data-tooltip="α=1 puro optimismo, α=0 puro pesimismo, α=0.5 equilibrado">α de Hurwicz</label>
            <span id="d-alpha-val" style="font-size:13px;font-weight:700;color:var(--brand);">0.50</span>
          </div>
          <input id="d-alpha" type="range" min="0" max="1" step="0.05" value="0.5" style="width:100%;"/>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-muted);">
            <span>Pesimista (0)</span><span>Optimista (1)</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div id="d-ex-pills"></div>
          <div id="d-hist-widget"></div>
        </div>
      `)}
      ${sectionCard("Matriz de pagos",`<div id="d-form"></div>`)}
      ${primaryBtn("d-resolver","Calcular todos los criterios")}
    </div>
    <div id="d-resultado">
      <div class="card" style="padding:48px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#cbd5e1;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <p style="font-size:13.5px;">Define la matriz de pagos y presiona Calcular</p>
      </div>
    </div>
  </div>`;
}

export function init() {
  document.getElementById("d-ex-pills").innerHTML = examplePills(EXAMPLES, loadExample);
  document.getElementById("d-hist-widget").innerHTML = historyWidget("decisiones", loadExample);
  buildForm(3,3,EXAMPLES[0].data);
  document.getElementById("d-gen").addEventListener("click",()=>{
    const na=parseInt(document.getElementById("d-na").value);
    const ne=parseInt(document.getElementById("d-ne").value);
    if(na<2||na>8||ne<2||ne>8) return showToast("Entre 2 y 8","error");
    buildForm(na,ne);
  });
  document.getElementById("d-resolver").addEventListener("click",resolver);
  document.getElementById("d-alpha").addEventListener("input",e=>{
    document.getElementById("d-alpha-val").textContent=parseFloat(e.target.value).toFixed(2);
  });
  // Inline validation: probability sum
  document.getElementById("d-form-col").addEventListener("input",checkProbSum);
}

function loadExample(data) {
  document.getElementById("d-na").value=data.na; document.getElementById("d-ne").value=data.ne;
  document.getElementById("d-tipo").value=data.tipo;
  buildForm(data.na,data.ne,data); showToast("Ejemplo cargado","info");
}

function buildForm(na,ne,data=null) {
  const def=data||{alternativas:Array.from({length:na},(_,i)=>`A${i+1}`),
                   estados:Array.from({length:ne},(_,j)=>`E${j+1}`),
                   matriz:Array.from({length:na},()=>Array(ne).fill(0)),probs:[]};
  let html=`<div class="overflow-x"><table class="io-table"><thead><tr>
    <th style="background:var(--bg);font-size:11px;">Alternativa</th>
    ${Array.from({length:ne},(_,j)=>`<th><input type="text" value="${def.estados?.[j]??`E${j+1}`}"
      class="d-estado" data-j="${j}" style="width:90px;padding:3px 6px;font-size:11.5px;text-align:center;font-weight:600;"
      data-tooltip="Estado de naturaleza ${j+1}"/></th>`).join("")}
    <th style="background:#dbeafe;font-size:11px;" data-tooltip="Probabilidad de cada estado (opcional, suma=1)">P(estado)</th>
    </tr></thead><tbody>
    ${Array.from({length:na},(_,i)=>`<tr>
      <td style="background:var(--bg);"><input type="text" value="${def.alternativas?.[i]??`A${i+1}`}"
        class="d-alt" data-i="${i}" style="width:100px;padding:3px 6px;font-size:12px;font-weight:500;"
        data-tooltip="Nombre de la alternativa ${i+1}"/></td>
      ${Array.from({length:ne},(_,j)=>`<td><input type="number" value="${def.matriz?.[i]?.[j]??0}"
        class="d-cell" data-i="${i}" data-j="${j}"
        style="width:72px;padding:4px 6px;font-size:13px;text-align:center;"
        data-tooltip="Pago de ${def.alternativas?.[i]??`A${i+1}`} bajo ${def.estados?.[j]??`E${j+1}`}"/></td>`).join("")}
      <td style="background:#eff6ff;"></td>
    </tr>`).join("")}
    <tr>
      <td style="background:#dbeafe;font-size:11px;font-weight:600;color:#1d4ed8;" data-tooltip="Probabilidades opcionales">P(Ej)</td>
      ${Array.from({length:ne},(_,j)=>`<td style="background:#eff6ff;">
        <input type="number" step="0.01" min="0" max="1" value="${def.probs?.[j]??""}" placeholder="0.00"
          class="d-prob" data-j="${j}" style="width:64px;padding:4px 6px;font-size:12px;text-align:center;"
          data-tooltip="Probabilidad del estado ${j+1}"/>
      </td>`).join("")}
      <td style="background:#dbeafe;" id="d-prob-sum-cell">
        <span id="d-prob-sum" style="font-size:11px;font-weight:600;"></span>
      </td>
    </tr>
    </tbody></table></div>
    <p style="font-size:11px;color:var(--text-muted);margin-top:6px;">Las probabilidades son opcionales (activan Valor Esperado y VEIP).</p>`;
  document.getElementById("d-form").innerHTML=html; checkProbSum();
}

function checkProbSum() {
  const probs=[...document.querySelectorAll(".d-prob")].map(i=>i.value.trim());
  const sumEl=document.getElementById("d-prob-sum"); if(!sumEl) return;
  if(probs.every(p=>p==="")) return (sumEl.textContent="");
  const vals=probs.map(p=>parseFloat(p)||0);
  const sum=vals.reduce((a,b)=>a+b,0);
  const ok=Math.abs(sum-1)<0.01;
  sumEl.textContent=`${sum.toFixed(2)}`;
  sumEl.style.color=ok?"#16a34a":sum>1?"#dc2626":"#d97706";
}

async function resolver() {
  const alternativas=[...document.querySelectorAll(".d-alt")].map(i=>i.value.trim()||`A${i.dataset.i}`);
  const estados=[...document.querySelectorAll(".d-estado")].map(i=>i.value.trim()||`E${i.dataset.j}`);
  const na=alternativas.length,ne=estados.length;
  const matriz=Array.from({length:na},()=>Array(ne).fill(0));
  for(const inp of document.querySelectorAll(".d-cell")){
    const v=parseFloat(inp.value);
    if(isNaN(v)) return showToast(`Valor inválido fila ${+inp.dataset.i+1}, col ${+inp.dataset.j+1}`,"error");
    matriz[+inp.dataset.i][+inp.dataset.j]=v;
  }
  const alpha=parseFloat(document.getElementById("d-alpha").value);
  const tipo=document.getElementById("d-tipo").value;
  let probabilidades=null;
  const probVals=[...document.querySelectorAll(".d-prob")].map(i=>i.value.trim());
  if(probVals.some(v=>v!=="")){
    probabilidades=probVals.map(v=>parseFloat(v));
    if(probabilidades.some(isNaN)) return showToast("Probabilidades inválidas","error");
    const suma=probabilidades.reduce((a,b)=>a+b,0);
    if(Math.abs(suma-1)>0.01) return showToast(`Las probabilidades suman ${suma.toFixed(2)}, deben sumar 1.0`,"error");
  }
  showSpinner("d-resultado");
  try {
    const res=await post("/decisiones/resolver",{alternativas,estados,matriz,probabilidades,alpha,tipo});
    if(res.error) return showError("d-resultado",res.error);
    saveHistory("decisiones",`Consenso: ${res.consenso}`,{na,ne,tipo,alternativas,estados,matriz,probs:probVals});
    renderResultado(res,alternativas,tipo); showToast(`Decisión recomendada: ${res.consenso}`,"success");
  } catch(e){showError("d-resultado",e.message);showToast(e.message,"error");}
}

function renderResultado(res,alternativas,tipo) {
  const criterios=Object.entries(res.resultados).filter(([,v])=>v?.decision);
  const veip=res.resultados["VEIP"];
  const rows=criterios.map(([nombre,data])=>`
    <tr style="${data.decision===res.consenso?"background:var(--brand-light);":""}">
      <td style="text-align:left;font-weight:500;">
        ${nombre}${data.alpha!==undefined?`<span style="font-size:11px;color:var(--text-muted);"> (α=${data.alpha})</span>`:""}
      </td>
      <td style="font-weight:700;color:${data.decision===res.consenso?"var(--brand)":"var(--text-primary)"};">${data.decision}</td>
      <td>${typeof data.valor==="number"?data.valor.toFixed(2):data.valor}</td>
      <td style="text-align:left;font-size:11.5px;color:var(--text-secondary);">
        ${alternativas.map((a,i)=>`${a}: <b>${data.valores[i]?.toFixed(2)??""}</b>`).join(" · ")}
      </td>
    </tr>`).join("");

  document.getElementById("d-resultado").innerHTML=`
    <div id="d-pdf-zone" class="flex-col gap-4">
      ${renderFormulacion("decisiones",{alternativas,estados:[...document.querySelectorAll(".d-estado")].map(i=>i.value),tipo})}
      ${sectionCard("Resumen de criterios",`
        <div style="background:var(--brand);border-radius:8px;padding:16px 20px;">
          <p style="font-size:11px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:.07em;">Decisión recomendada (consenso)</p>
          <p style="font-size:22px;font-weight:700;color:white;">${res.consenso}</p>
        </div>
        <div class="overflow-x">
          <table class="io-table">
            <thead><tr><th style="text-align:left;">Criterio</th><th>Decisión</th><th>Valor</th><th style="text-align:left;">Detalle</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${veip?`<div style="background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:8px;padding:12px 16px;">
          <p style="font-size:12px;font-weight:600;color:#6d28d9;margin-bottom:4px;" data-tooltip="El máximo que vale pagar por información perfecta sobre el estado de la naturaleza">VEIP — Valor Esperado de Información Perfecta</p>
          <p style="font-size:13px;color:#4c1d95;">VEP = ${veip.VEP} &nbsp;·&nbsp; VEIP = <strong>${veip.VEIP}</strong></p>
        </div>`:""}
        ${showInterpretacion(res.interpretacion)}
        <div style="display:flex;justify-content:flex-end;">${pdfBtn("d-pdf-zone","decisiones.pdf","Teoría de Decisiones")}</div>
      `)}
      ${sectionCard("Procedimiento detallado",renderPasos(res.pasos))}
    </div>`;
  animateNumbers("d-resultado");
}
