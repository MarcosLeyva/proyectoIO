import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, StepsPanel, LiveBadge, LoadingCard, ErrorCard, PdfButton } from '../../components/shared/SharedComponents'
import { Formulacion } from '../../components/shared/Formulacion'
import { SensibilidadPanel } from '../../components/shared/SensibilidadPanel'
import { Button, PrimaryButton, Input, Select, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

interface Restriccion { a: string; b: string; op: string; rhs: string }
interface GraficoData { c1: number; c2: number; tipo: string; rows: { a: number; b: number; op: string; rhs: number }[] }
interface Vertice { x1: number; x2: number; z: number }
interface GraficoResult { optimo: Vertice; vertices: Vertice[]; pasos: string[]; interpretacion: string }

const EXAMPLES = [
  { label: 'Producción',     data: { c1:5, c2:4, tipo:'max', rows:[{a:6,b:4,op:'<=',rhs:24},{a:1,b:2,op:'<=',rhs:6}] } },
  { label: 'Dieta (mín)',    data: { c1:2, c2:3, tipo:'min', rows:[{a:1,b:2,op:'>=',rhs:6},{a:2,b:1,op:'>=',rhs:8}] } },
  { label: 'Utilidad 3 R.',  data: { c1:3, c2:5, tipo:'max', rows:[{a:1,b:0,op:'<=',rhs:4},{a:0,b:2,op:'<=',rhs:12},{a:3,b:5,op:'<=',rhs:25}] } },
]

function clientVertices(c1: number, c2: number, restricciones: { a:number; b:number; op:string; rhs:number }[], tipo: string) {
  const A: number[][] = [], b: number[] = []
  for (const r of restricciones) {
    if (r.op === '<=')      { A.push([ r.a, r.b]); b.push( r.rhs) }
    else if (r.op === '>=') { A.push([-r.a,-r.b]); b.push(-r.rhs) }
    else { A.push([r.a,r.b]); b.push(r.rhs); A.push([-r.a,-r.b]); b.push(-r.rhs) }
  }
  A.push([-1,0]); b.push(0); A.push([0,-1]); b.push(0)
  const verts: Vertice[] = []
  for (let i = 0; i < A.length; i++) {
    for (let j = i+1; j < A.length; j++) {
      const det = A[i][0]*A[j][1] - A[i][1]*A[j][0]
      if (Math.abs(det) < 1e-10) continue
      const x1 = (b[i]*A[j][1] - b[j]*A[i][1]) / det
      const x2 = (A[i][0]*b[j] - A[j][0]*b[i]) / det
      if (A.some((row, k) => row[0]*x1 + row[1]*x2 > b[k] + 1e-8)) continue
      verts.push({ x1: Math.round(x1*1e6)/1e6, x2: Math.round(x2*1e6)/1e6, z: Math.round((c1*x1+c2*x2)*1e6)/1e6 })
    }
  }
  if (!verts.length) return null
  const opt = verts.reduce((best, v) => tipo === 'max' ? (v.z > best.z ? v : best) : (v.z < best.z ? v : best))
  return { vertices: verts, optimo: opt }
}

interface ObjLine { c1: number; c2: number; level: number }

function drawGraph(
  canvas: HTMLCanvasElement,
  res: { vertices: Vertice[]; optimo: Vertice },
  rectas: { a:number; b:number; op:string; rhs:number }[],
  isDark: boolean,
  objLine?: ObjLine,
) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height, PAD = 48
  const allX = res.vertices.map(v => v.x1).concat([0])
  const allY = res.vertices.map(v => v.x2).concat([0])
  const maxX = Math.max(...allX) * 1.35 || 10
  const maxY = Math.max(...allY) * 1.35 || 10
  const tx = (x: number) => PAD + (x / maxX) * (W - PAD * 2)
  const ty = (y: number) => H - PAD - (y / maxY) * (H - PAD * 2)
  const bg = isDark ? '#0f172a' : '#f8fafc'
  const gridColor = isDark ? '#1e293b' : '#e2e8f0'
  const axisColor = isDark ? '#475569' : '#94a3b8'
  const textColor = isDark ? '#64748b' : '#475569'
  const colors = ['#6366f1','#0891b2','#059669','#d97706','#dc2626']

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const xv = (maxX/5)*i, yv = (maxY/5)*i
    ctx.beginPath(); ctx.moveTo(tx(xv), PAD); ctx.lineTo(tx(xv), H-PAD); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(PAD, ty(yv)); ctx.lineTo(W-PAD, ty(yv)); ctx.stroke()
  }
  ctx.strokeStyle = axisColor; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(PAD, PAD-5); ctx.lineTo(PAD, H-PAD+5); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(PAD-5, H-PAD); ctx.lineTo(W-PAD+5, H-PAD); ctx.stroke()
  ctx.fillStyle = textColor; ctx.font = '10.5px Inter,sans-serif'; ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    ctx.fillText(String(Math.round((maxX/5)*i*10)/10), tx((maxX/5)*i), H-PAD+14)
    ctx.textAlign = 'right'; ctx.fillText(String(Math.round((maxY/5)*i*10)/10), PAD-7, ty((maxY/5)*i)+3); ctx.textAlign = 'center'
  }
  ctx.fillStyle = isDark ? '#94a3b8' : '#475569'; ctx.font = 'bold 11.5px Inter,sans-serif'
  ctx.fillText('x₁', W-PAD+16, H-PAD+5); ctx.fillText('x₂', PAD, PAD-14)
  rectas.forEach((r, idx) => {
    ctx.strokeStyle = colors[idx % colors.length]; ctx.lineWidth = 2; ctx.setLineDash([5,4])
    ctx.beginPath()
    let pts: { x:number; y:number }[] = []
    if (Math.abs(r.b) > 1e-8) pts = [{x:0, y:r.rhs/r.b}, {x:maxX, y:(r.rhs-r.a*maxX)/r.b}]
    else if (Math.abs(r.a) > 1e-8) { const xc = r.rhs/r.a; pts = [{x:xc,y:0},{x:xc,y:maxY}] }
    pts.forEach((p, i) => i===0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y)))
    ctx.stroke()
  })
  ctx.setLineDash([])
  if (res.vertices.length >= 3) {
    const cx0 = res.vertices.reduce((s,v) => s+v.x1, 0) / res.vertices.length
    const cy0 = res.vertices.reduce((s,v) => s+v.x2, 0) / res.vertices.length
    const sorted = [...res.vertices].sort((a,b) => Math.atan2(a.x2-cy0,a.x1-cx0) - Math.atan2(b.x2-cy0,b.x1-cx0))
    ctx.fillStyle = 'rgba(99,102,241,0.12)'; ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1.5
    ctx.beginPath()
    sorted.forEach((v, i) => i===0 ? ctx.moveTo(tx(v.x1), ty(v.x2)) : ctx.lineTo(tx(v.x1), ty(v.x2)))
    ctx.closePath(); ctx.fill(); ctx.stroke()
  }

  // Recta de la función objetivo (isoutilidad) — animada
  if (objLine && (Math.abs(objLine.c1) > 1e-9 || Math.abs(objLine.c2) > 1e-9)) {
    const { c1, c2, level } = objLine
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.setLineDash([])
    ctx.shadowColor = 'rgba(245,158,11,0.5)'; ctx.shadowBlur = 8
    ctx.beginPath()
    let pts: { x:number; y:number }[] = []
    if (Math.abs(c2) > 1e-9) pts = [{x:0, y:level/c2}, {x:maxX, y:(level-c1*maxX)/c2}]
    else if (Math.abs(c1) > 1e-9) { const xc = level/c1; pts = [{x:xc,y:0},{x:xc,y:maxY}] }
    pts.forEach((p, i) => i===0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y)))
    ctx.stroke()
    ctx.shadowBlur = 0
    // Etiqueta Z = level cerca del eje
    ctx.fillStyle = '#b45309'; ctx.font = 'bold 12px Inter,sans-serif'; ctx.textAlign = 'left'
    const lblPt = pts[0]
    ctx.fillText(`Z = ${Math.round(level*100)/100}`, tx(Math.min(lblPt.x, maxX*0.15))+8, ty(lblPt.y)-6)
  }

  res.vertices.forEach(v => {
    ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(tx(v.x1), ty(v.x2), 4, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155'; ctx.font = '10.5px Inter,sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(`(${v.x1},${v.x2})`, tx(v.x1)+7, ty(v.x2)-5)
  })
  const op = res.optimo
  ctx.fillStyle = '#6366f1'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(tx(op.x1), ty(op.x2), 9, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b'; ctx.font = 'bold 11.5px Inter,sans-serif'; ctx.textAlign = 'left'
  ctx.fillText(`Z=${op.z}`, tx(op.x1)+13, ty(op.x2)-11)
}

export function GraficoPage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [c1, setC1] = useState('5')
  const [c2, setC2] = useState('4')
  const [tipo, setTipo] = useState('max')
  const [rows, setRows] = useState<Restriccion[]>([
    { a:'6', b:'4', op:'<=', rhs:'24' },
    { a:'1', b:'2', op:'<=', rhs:'6' },
  ])
  const [result, setResult] = useState<GraficoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [animating, setAnimating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const rafRef = useRef<number>(undefined)
  const lastPreview = useRef<{ vertices: Vertice[]; optimo: Vertice; rectas: { a:number; b:number; op:string; rhs:number }[] } | null>(null)
  const history = getHistory('grafico')
  const isDark = document.documentElement.classList.contains('dark')

  const addRow = () => setRows(r => [...r, { a:'', b:'', op:'<=', rhs:'' }])
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof Restriccion, val: string) => {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  const loadExample = useCallback((data: unknown) => {
    const d = data as GraficoData
    setC1(String(d.c1)); setC2(String(d.c2)); setTipo(d.tipo)
    setRows(d.rows.map(r => ({ a:String(r.a), b:String(r.b), op:r.op, rhs:String(r.rhs) })))
    setResult(null)
    showToast('Ejemplo cargado', 'info')
  }, [])

  const buildRestricciones = () => rows
    .map(r => ({ a:parseFloat(r.a), b:parseFloat(r.b), op:r.op, rhs:parseFloat(r.rhs) }))
    .filter(r => !isNaN(r.a) && !isNaN(r.b) && !isNaN(r.rhs))

  const livePreview = useCallback(() => {
    const nc1 = parseFloat(c1), nc2 = parseFloat(c2)
    if (isNaN(nc1) || isNaN(nc2)) return
    const restricciones = buildRestricciones()
    if (!restricciones.length) return
    const res = clientVertices(nc1, nc2, restricciones, tipo)
    if (!res) return
    lastPreview.current = { ...res, rectas: restricciones }
    if (canvasRef.current && !animating) drawGraph(canvasRef.current, res, restricciones, isDark)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c1, c2, tipo, rows, isDark, animating])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(livePreview, 280)
    return () => clearTimeout(debounceRef.current)
  }, [livePreview])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // ── Animación de la recta objetivo deslizándose hasta el óptimo ──────────
  const animateObjective = () => {
    const prev = lastPreview.current
    const nc1 = parseFloat(c1), nc2 = parseFloat(c2)
    if (!prev || !canvasRef.current || isNaN(nc1) || isNaN(nc2)) return
    setAnimating(true)
    const zTarget = prev.optimo.z
    // Para minimización el nivel sube desde un valor pequeño; para max desde 0.
    const zStart = tipo === 'max' ? 0 : Math.max(0, zTarget * 0.2)
    const duration = 1800
    const t0 = performance.now()

    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const level = zStart + (zTarget - zStart) * eased
      drawGraph(canvasRef.current!, prev, prev.rectas, isDark, { c1: nc1, c2: nc2, level })
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setAnimating(false)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const resetGraph = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setAnimating(false)
    if (lastPreview.current && canvasRef.current) {
      drawGraph(canvasRef.current, lastPreview.current, lastPreview.current.rectas, isDark)
    }
  }

  const handleResolve = async () => {
    const nc1 = parseFloat(c1), nc2 = parseFloat(c2)
    if (isNaN(nc1) || isNaN(nc2)) return showToast('Coeficientes inválidos', 'error')
    const restricciones = rows.map(r => ({ a:parseFloat(r.a), b:parseFloat(r.b), op:r.op, rhs:parseFloat(r.rhs) }))
    if (restricciones.some(r => isNaN(r.a)||isNaN(r.b)||isNaN(r.rhs))) return showToast('Revisa las restricciones', 'error')
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiPost<GraficoResult>('/grafico/resolver', { obj:[nc1,nc2], restricciones, tipo })
      setResult(res)
      saveHistory('grafico', `Z=${res.optimo.z} · x₁=${res.optimo.x1}, x₂=${res.optimo.x2}`, { c1:nc1, c2:nc2, tipo, rows: restricciones })
      showToast('Solución encontrada', 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg); showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[340px_1fr]">
      {/* Form Column */}
      <div className="flex flex-col gap-4">
        <SectionCard title="Función objetivo">
          <div className="flex gap-2.5 items-end flex-wrap">
            <Input label="c₁" type="number" value={c1} onChange={(e: any) => setC1(e.target.value)} className="w-16" placeholder="5" />
            <span className="text-sm text-slate-400 pb-2">x₁ +</span>
            <Input label="c₂" type="number" value={c2} onChange={(e: any) => setC2(e.target.value)} className="w-16" placeholder="4" />
            <span className="text-sm text-slate-400 pb-2">x₂</span>
            <Select label="Objetivo" value={tipo} onChange={(e: any) => setTipo(e.target.value)} className="flex-1 min-w-[100px]">
              <option value="max">Maximizar Z</option>
              <option value="min">Minimizar Z</option>
            </Select>
          </div>
          <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
        </SectionCard>

        <SectionCard title="Restricciones" actions={
          history.length > 0 ? <HistoryDropdown history={history} onLoad={loadExample} onClear={() => clearHistory('grafico')} /> : undefined
        }>
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                <input type="number" value={row.a} onChange={(e: any) => updateRow(i,'a',e.target.value)} placeholder="a₁" className="io-input w-14 text-center" />
                <span className="text-xs text-slate-400">x₁ +</span>
                <input type="number" value={row.b} onChange={(e: any) => updateRow(i,'b',e.target.value)} placeholder="a₂" className="io-input w-14 text-center" />
                <span className="text-xs text-slate-400">x₂</span>
                <select value={row.op} onChange={(e: any) => updateRow(i,'op',e.target.value)} className="io-input w-14 text-center">
                  <option value="<=">≤</option>
                  <option value=">=">≥</option>
                  <option value="=">=</option>
                </select>
                <input type="number" value={row.rhs} onChange={(e: any) => updateRow(i,'rhs',e.target.value)} placeholder="RHS" className="io-input w-16 text-center" />
                <Button variant="ghost" size="sm" onClick={() => removeRow(i)} title="Eliminar">×</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addRow} className="mt-1">+ Agregar restricción</Button>
        </SectionCard>

        <PrimaryButton onClick={handleResolve} loading={loading}>
          {loading ? 'Calculando...' : '▶ Resolver'}
        </PrimaryButton>
      </div>

      {/* Result Column */}
      <div className="flex flex-col gap-4">
        <SectionCard title="Región factible" actions={
          result ? (
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={animating ? resetGraph : animateObjective}>
                {animating ? <><Pause className="w-3.5 h-3.5" /> Animando…</> : <><Play className="w-3.5 h-3.5" /> Animar recta Z</>}
              </Button>
              {!animating && (
                <Button variant="ghost" size="sm" onClick={resetGraph} title="Reiniciar"><RotateCcw className="w-3.5 h-3.5" /></Button>
              )}
            </div>
          ) : <LiveBadge />
        }>
          <canvas ref={canvasRef} width={520} height={320} className="w-full rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
          {result && (
            <p className="text-xs text-slate-400 text-center">
              La recta ámbar es la función objetivo Z; se desliza hasta tocar el vértice óptimo.
            </p>
          )}
        </SectionCard>

        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div ref={pdfRef} className="flex flex-col gap-4 animate-slide-up">
            <Formulacion tipo="pl" data={{
              obj: [parseFloat(c1) || 0, parseFloat(c2) || 0],
              restricciones: buildRestricciones().map(r => ({ coefs: [r.a, r.b], op: r.op, rhs: r.rhs })),
              tipo,
            }} />
            <SectionCard title="Solución óptima" actions={<PdfButton targetRef={pdfRef} filename="metodo-grafico.pdf" titulo="Método Gráfico" />}>
              <div className="flex gap-3 flex-wrap">
                <StatCard label="x₁" value={result.optimo.x1} />
                <StatCard label="x₂" value={result.optimo.x2} />
                <StatCard label={`Z (${tipo === 'max' ? 'máx' : 'mín'})`} value={result.optimo.z} accent />
              </div>
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            <SensibilidadPanel
              obj={[parseFloat(c1) || 0, parseFloat(c2) || 0]}
              restricciones={buildRestricciones().map(r => ({ coefs: [r.a, r.b], op: r.op, rhs: r.rhs }))}
              tipo={tipo}
            />

            <SectionCard title="Vértices evaluados">
              <div className="overflow-x-auto">
                <table className="io-table">
                  <thead><tr><th>x₁</th><th>x₂</th><th>Z</th></tr></thead>
                  <tbody>
                    {result.vertices.map((v, i) => {
                      const isOpt = v.x1 === result.optimo.x1 && v.x2 === result.optimo.x2
                      return (
                        <tr key={i} className={isOpt ? 'optimal' : ''}>
                          <td>{v.x1}</td><td>{v.x2}</td>
                          <td className={isOpt ? 'highlight' : ''}>{v.z}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {result.pasos?.length > 0 && (
              <SectionCard title="Procedimiento">
                <StepsPanel pasos={result.pasos} />
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
