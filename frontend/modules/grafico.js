import { post } from "/static/js/api.js";
import { showSpinner, showError, showInterpretacion, renderPasos, sectionCard,
         statCard, primaryBtn, secondaryBtn, pdfBtn, animateNumbers,
         showToast, examplePills, enterToSubmit, validateNumber } from "/static/js/utils.js";
import { renderFormulacion } from "/static/js/formulacion.js";
import { saveHistory, historyWidget } from "/static/js/history.js";

const EXAMPLES = [
  { label: "Producción",
    data: { c1:5, c2:4, tipo:"max", rows:[{a:6,b:4,op:"<=",rhs:24},{a:1,b:2,op:"<=",rhs:6}] } },
  { label: "Dieta (mín)",
    data: { c1:2, c2:3, tipo:"min", rows:[{a:1,b:2,op:">=",rhs:6},{a:2,b:1,op:">=",rhs:8}] } },
  { label: "Utilidad 3 rest.",
    data: { c1:3, c2:5, tipo:"max", rows:[{a:1,b:0,op:"<=",rhs:4},{a:0,b:2,op:"<=",rhs:12},{a:3,b:5,op:"<=",rhs:25}] } },
];

let _debounce = null;
const INP = "padding:6px 8px;font-size:13px;";

function clientVertices(c1, c2, restricciones, tipo) {
  const A=[], b=[];
  for (const r of restricciones) {
    if (r.op==="<=")      { A.push([ r.a, r.b]); b.push( r.rhs); }
    else if (r.op===">=") { A.push([-r.a,-r.b]); b.push(-r.rhs); }
    else { A.push([r.a,r.b]); b.push(r.rhs); A.push([-r.a,-r.b]); b.push(-r.rhs); }
  }
  A.push([-1,0]); b.push(0); A.push([0,-1]); b.push(0);
  const verts=[];
  for (let i=0;i<A.length;i++) for (let j=i+1;j<A.length;j++) {
    const det=A[i][0]*A[j][1]-A[i][1]*A[j][0];
    if (Math.abs(det)<1e-10) continue;
    const x1=(b[i]*A[j][1]-b[j]*A[i][1])/det;
    const x2=(A[i][0]*b[j]-A[j][0]*b[i])/det;
    if (A.some((row,k)=>row[0]*x1+row[1]*x2>b[k]+1e-8)) continue;
    verts.push({x1:Math.round(x1*1e6)/1e6, x2:Math.round(x2*1e6)/1e6,
                z:Math.round((c1*x1+c2*x2)*1e6)/1e6});
  }
  if (!verts.length) return null;
  const opt = verts.reduce((best,v)=>tipo==="max"?(v.z>best.z?v:best):(v.z<best.z?v:best));
  return {vertices:verts, optimo:opt};
}

export function render() {
  return `
  <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start;">
    <div id="g-form-col" class="flex-col gap-4">
      ${sectionCard("Función objetivo", `
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
          <div class="flex-col" style="gap:3px;">
            <label class="label" data-tooltip="Coeficiente de x₁ en la función objetivo">c₁</label>
            <input id="g-c1" type="number" value="5" style="width:64px;${INP}" />
          </div>
          <span style="font-size:13px;color:var(--text-muted);padding-bottom:8px;">x₁ +</span>
          <div class="flex-col" style="gap:3px;">
            <label class="label" data-tooltip="Coeficiente de x₂ en la función objetivo">c₂</label>
            <input id="g-c2" type="number" value="4" style="width:64px;${INP}" />
          </div>
          <span style="font-size:13px;color:var(--text-muted);padding-bottom:8px;">x₂</span>
          <div class="flex-col" style="gap:3px;">
            <label class="label">Objetivo</label>
            <select id="g-tipo" style="${INP}">
              <option value="max">Maximizar Z</option>
              <option value="min">Minimizar Z</option>
            </select>
          </div>
        </div>
        <div id="g-ex-pills"></div>
      `)}
      ${sectionCard("Restricciones", `
        <div id="g-restricciones" class="flex-col" style="gap:6px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          ${secondaryBtn("g-add-row","+ Agregar restricción")}
          <div id="g-hist-widget"></div>
        </div>
      `)}
      ${primaryBtn("g-resolver","Resolver")}
    </div>

    <div class="flex-col gap-4">
      <div class="card" style="padding:18px 20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;">Vista previa en vivo</span>
          <span class="live-badge">En vivo</span>
        </div>
        <canvas id="g-canvas-live" width="520" height="340" style="width:100%;border-radius:6px;border:1px solid var(--border-soft);background:#f8fafc;"></canvas>
        <div id="g-live-info" style="margin-top:10px;min-height:36px;"></div>
      </div>
      <div id="g-resultado"></div>
    </div>
  </div>`;
}

export function init() {
  const container = document.getElementById("g-restricciones");

  // Ejemplos
  document.getElementById("g-ex-pills").innerHTML = examplePills(EXAMPLES, loadExample);

  // Historial
  document.getElementById("g-hist-widget").innerHTML = historyWidget("grafico", loadExample);

  function loadExample(data) {
    document.getElementById("g-c1").value = data.c1;
    document.getElementById("g-c2").value = data.c2;
    document.getElementById("g-tipo").value = data.tipo;
    container.innerHTML = "";
    data.rows.forEach(r => addRow(r.a, r.b, r.op, r.rhs));
    scheduleLive();
  }

  function addRow(a="",b="",op="<=",rhs="") {
    const div = document.createElement("div");
    div.style.cssText="display:flex;align-items:center;gap:6px;flex-wrap:wrap;";
    div.innerHTML=`
      <input type="number" value="${a}" placeholder="a₁" style="width:58px;${INP}" class="g-r-a"
        data-tooltip="Coeficiente de x₁"/>
      <span style="font-size:12px;color:var(--text-muted);">x₁ +</span>
      <input type="number" value="${b}" placeholder="a₂" style="width:58px;${INP}" class="g-r-b"
        data-tooltip="Coeficiente de x₂"/>
      <span style="font-size:12px;color:var(--text-muted);">x₂</span>
      <select style="${INP}" data-tooltip="Tipo de restricción">
        <option ${op==="<="?"selected":""}><=</option>
        <option ${op===">="?"selected":""}>&gt;=</option>
        <option ${op==="="?"selected":""}>=</option>
      </select>
      <input type="number" value="${rhs}" placeholder="RHS" style="width:68px;${INP}" class="g-r-rhs"
        data-tooltip="Lado derecho de la restricción"/>
      <button class="btn btn-ghost" data-tooltip="Eliminar restricción">×</button>`;
    div.querySelector("button").addEventListener("click", () => {
      div.style.opacity="0"; div.style.transition="opacity .15s";
      setTimeout(()=>{div.remove();scheduleLive();},150);
    });
    container.appendChild(div);
  }

  addRow(6,4,"<=",24); addRow(1,2,"<=",6);

  document.getElementById("g-add-row").addEventListener("click", () => { addRow(); scheduleLive(); });

  // Live preview
  const watchRoot = document.getElementById("g-form-col");
  watchRoot.addEventListener("input", scheduleLive);
  watchRoot.addEventListener("change", scheduleLive);

  function scheduleLive() {
    clearTimeout(_debounce);
    _debounce = setTimeout(livePreview, 280);
  }

  function livePreview() {
    const c1=parseFloat(document.getElementById("g-c1").value);
    const c2=parseFloat(document.getElementById("g-c2").value);
    const tipo=document.getElementById("g-tipo").value;
    if (isNaN(c1)||isNaN(c2)) return;
    const restricciones=[];
    container.querySelectorAll("div").forEach(row=>{
      const a=parseFloat(row.querySelector(".g-r-a")?.value);
      const b=parseFloat(row.querySelector(".g-r-b")?.value);
      const rhs=parseFloat(row.querySelector(".g-r-rhs")?.value);
      const op=row.querySelector("select")?.value||"<=";
      if (!isNaN(a)&&!isNaN(b)&&!isNaN(rhs)) restricciones.push({a,b,op,rhs});
    });
    if (!restricciones.length) return;
    const result=clientVertices(c1,c2,restricciones,tipo);
    if (!result) return;
    drawGraph(document.getElementById("g-canvas-live"),result,restricciones);
    document.getElementById("g-live-info").innerHTML=`
      <div class="flex-row gap-3 wrap">
        <div style="background:var(--brand-light);border-radius:6px;padding:6px 12px;font-size:12.5px;">
          <span style="color:var(--text-muted);font-size:11px;">Óptimo</span>
          <p style="color:var(--brand);font-weight:700;margin:0;">x₁=${result.optimo.x1} · x₂=${result.optimo.x2} · Z=${result.optimo.z}</p>
        </div>
        <div style="background:#f0fdf4;border-radius:6px;padding:6px 12px;font-size:12.5px;">
          <span style="color:var(--text-muted);font-size:11px;">Vértices factibles</span>
          <p style="color:#16a34a;font-weight:700;margin:0;">${result.vertices.length}</p>
        </div>
      </div>`;
  }

  setTimeout(livePreview, 80);

  // Enter to submit
  enterToSubmit("g-form-col", "g-resolver");

  document.getElementById("g-resolver").addEventListener("click", async () => {
    const c1=parseFloat(document.getElementById("g-c1").value);
    const c2=parseFloat(document.getElementById("g-c2").value);
    const tipo=document.getElementById("g-tipo").value;

    // Validación inline
    let valid = true;
    const c1El = document.getElementById("g-c1");
    const c2El = document.getElementById("g-c2");
    if (!validateNumber(c1El,{label:"c₁"})) valid=false;
    if (!validateNumber(c2El,{label:"c₂"})) valid=false;
    if (!valid) return showToast("Corrige los campos en rojo","error");

    const rows=container.querySelectorAll("div");
    const restricciones=[];
    rows.forEach(row=>{
      const a=parseFloat(row.querySelector(".g-r-a")?.value);
      const b=parseFloat(row.querySelector(".g-r-b")?.value);
      const rhs=parseFloat(row.querySelector(".g-r-rhs")?.value);
      const op=row.querySelector("select")?.value||"<=";
      if (isNaN(a)||isNaN(b)||isNaN(rhs)){valid=false;return;}
      restricciones.push({a,b,op,rhs});
    });
    if (!valid||!restricciones.length) return showToast("Revisa las restricciones","error");

    showSpinner("g-resultado");
    try {
      const res=await post("/grafico/resolver",{obj:[c1,c2],restricciones,tipo});
      if (res.error) return showError("g-resultado",res.error);

      // Guardar en historial
      const label=`Z=${res.optimo.z} · x₁=${res.optimo.x1}, x₂=${res.optimo.x2}`;
      saveHistory("grafico", label, {c1,c2,tipo,rows:restricciones.map(r=>r)});

      renderResultado(res, c1, c2, restricciones, tipo);
      showToast("Solución encontrada","success");
    } catch(e) { showError("g-resultado",e.message); showToast(e.message,"error"); }
  });
}

function renderResultado(res, c1, c2, restricciones, tipo) {
  document.getElementById("g-resultado").innerHTML=`
    <div id="g-pdf-zone" class="flex-col gap-4">
      ${renderFormulacion("pl",{obj:[c1,c2],restricciones,tipo})}
      ${sectionCard("Solución óptima",`
        <div class="flex-row gap-3 wrap">
          ${statCard("x₁",res.optimo.x1)}
          ${statCard("x₂",res.optimo.x2)}
          ${statCard("Z "+(tipo==="max"?"(máx)":"(mín)"),res.optimo.z)}
        </div>
        ${showInterpretacion(res.interpretacion)}
        <div style="display:flex;justify-content:flex-end;">${pdfBtn("g-pdf-zone","metodo-grafico.pdf","Método Gráfico")}</div>
      `)}
      ${sectionCard("Vértices evaluados",`
        <table class="io-table">
          <thead><tr><th>x₁</th><th>x₂</th><th>Z</th></tr></thead>
          <tbody>${res.vertices.map(v=>`
            <tr class="${v.x1===res.optimo.x1&&v.x2===res.optimo.x2?"optimal":""}">
              <td>${v.x1}</td><td>${v.x2}</td>
              <td style="font-weight:${v.x1===res.optimo.x1&&v.x2===res.optimo.x2?700:400};
                         color:${v.x1===res.optimo.x1&&v.x2===res.optimo.x2?"var(--brand)":"inherit"}">${v.z}</td>
            </tr>`).join("")}</tbody>
        </table>
      `)}
      ${sectionCard("Procedimiento",renderPasos(res.pasos))}
    </div>`;
  animateNumbers("g-resultado");
}

function drawGraph(canvas, res, rectas) {
  const ctx=canvas.getContext("2d");
  const W=canvas.width,H=canvas.height,PAD=48;
  const allX=res.vertices.map(v=>v.x1).concat([0]);
  const allY=res.vertices.map(v=>v.x2).concat([0]);
  const maxX=Math.max(...allX)*1.35||10, maxY=Math.max(...allY)*1.35||10;
  const tx=x=>PAD+(x/maxX)*(W-PAD*2), ty=y=>H-PAD-(y/maxY)*(H-PAD*2);
  ctx.clearRect(0,0,W,H); ctx.fillStyle="#f8fafc"; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#e2e8f0"; ctx.lineWidth=1;
  for(let i=0;i<=5;i++){
    const xv=(maxX/5)*i,yv=(maxY/5)*i;
    ctx.beginPath();ctx.moveTo(tx(xv),PAD);ctx.lineTo(tx(xv),H-PAD);ctx.stroke();
    ctx.beginPath();ctx.moveTo(PAD,ty(yv));ctx.lineTo(W-PAD,ty(yv));ctx.stroke();
  }
  ctx.strokeStyle="#94a3b8"; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(PAD,PAD-5);ctx.lineTo(PAD,H-PAD+5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(PAD-5,H-PAD);ctx.lineTo(W-PAD+5,H-PAD);ctx.stroke();
  ctx.fillStyle="#64748b"; ctx.font="10.5px Inter,sans-serif"; ctx.textAlign="center";
  for(let i=0;i<=5;i++){
    ctx.fillText(Math.round((maxX/5)*i*10)/10,tx((maxX/5)*i),H-PAD+14);
    ctx.textAlign="right";ctx.fillText(Math.round((maxY/5)*i*10)/10,PAD-7,ty((maxY/5)*i)+3);ctx.textAlign="center";
  }
  ctx.fillStyle="#475569"; ctx.font="bold 11.5px Inter,sans-serif";
  ctx.fillText("x₁",W-PAD+16,H-PAD+5); ctx.fillText("x₂",PAD,PAD-14);
  const colors=["#4f46e5","#0891b2","#059669","#d97706","#dc2626"];
  rectas.forEach((r,idx)=>{
    ctx.strokeStyle=colors[idx%colors.length]; ctx.lineWidth=1.8; ctx.setLineDash([5,4]);
    ctx.beginPath();
    let pts=[];
    if(Math.abs(r.b)>1e-8) pts=[{x:0,y:r.rhs/r.b},{x:maxX,y:(r.rhs-r.a*maxX)/r.b}];
    else if(Math.abs(r.a)>1e-8){const xc=r.rhs/r.a;pts=[{x:xc,y:0},{x:xc,y:maxY}];}
    pts.forEach((p,i)=>i===0?ctx.moveTo(tx(p.x),ty(p.y)):ctx.lineTo(tx(p.x),ty(p.y)));
    ctx.stroke();
  });
  ctx.setLineDash([]);
  if(res.vertices.length>=3){
    const cx0=res.vertices.reduce((s,v)=>s+v.x1,0)/res.vertices.length;
    const cy0=res.vertices.reduce((s,v)=>s+v.x2,0)/res.vertices.length;
    const sorted=[...res.vertices].sort((a,b)=>Math.atan2(a.x2-cy0,a.x1-cx0)-Math.atan2(b.x2-cy0,b.x1-cx0));
    ctx.fillStyle="rgba(79,70,229,0.09)"; ctx.strokeStyle="rgba(79,70,229,0.25)"; ctx.lineWidth=1.5;
    ctx.beginPath();
    sorted.forEach((v,i)=>i===0?ctx.moveTo(tx(v.x1),ty(v.x2)):ctx.lineTo(tx(v.x1),ty(v.x2)));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  res.vertices.forEach(v=>{
    ctx.fillStyle="#4f46e5"; ctx.beginPath(); ctx.arc(tx(v.x1),ty(v.x2),4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#334155"; ctx.font="10.5px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`(${v.x1},${v.x2})`,tx(v.x1)+7,ty(v.x2)-5);
  });
  const op=res.optimo;
  ctx.fillStyle="#4f46e5"; ctx.strokeStyle="white"; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(tx(op.x1),ty(op.x2),8,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#1e293b"; ctx.font="bold 11.5px Inter,sans-serif"; ctx.textAlign="left";
  ctx.fillText(`Z=${op.z}`,tx(op.x1)+12,ty(op.x2)-10);
}
