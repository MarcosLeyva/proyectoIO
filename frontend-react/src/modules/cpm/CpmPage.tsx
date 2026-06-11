import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, LoadingCard, ErrorCard } from '../../components/shared/SharedComponents'
import { Button, PrimaryButton, Input, Select, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

// CDF normal estándar vía aproximación de error de Abramowitz-Stegun
function normalCDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return x >= mu ? 1 : 0
  const z = (x - mu) / (sigma * Math.SQRT2)
  // erf aproximado
  const t = 1 / (1 + 0.3275911 * Math.abs(z))
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z)
  const erf = z >= 0 ? y : -y
  return 0.5 * (1 + erf)
}

function normalPDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))
}

interface Actividad { id: string; nombre: string; preds: string; dur: string; opt?: string; prob?: string; pes?: string }
interface NodoCPM { id: string; nombre: string; duracion: number; ES: number; EF: number; LS: number; LF: number; holgura: number; critica: boolean }
interface CPMResult {
  duracion_proyecto: number
  ruta_critica: string[]
  nodos: NodoCPM[]
  edges: { from: string; to: string }[]
  pasos: string[]
  interpretacion: string
  desv_proyecto?: number
  varianza_proyecto?: number
}

const EXAMPLES = [
  { label: 'Proyecto SW', data: [
    {id:'A',nombre:'Requisitos',preds:'',dur:'3'},{id:'B',nombre:'Diseño',preds:'A',dur:'4'},
    {id:'C',nombre:'Backend',preds:'B',dur:'6'},{id:'D',nombre:'Frontend',preds:'B',dur:'5'},
    {id:'E',nombre:'Pruebas',preds:'C,D',dur:'3'},{id:'F',nombre:'Deploy',preds:'E',dur:'2'}
  ]},
  { label: 'Construcción', data: [
    {id:'A',nombre:'Cimientos',preds:'',dur:'8'},{id:'B',nombre:'Estructura',preds:'A',dur:'12'},
    {id:'C',nombre:'Paredes',preds:'B',dur:'6'},{id:'D',nombre:'Instalaciones',preds:'B',dur:'5'},
    {id:'E',nombre:'Acabados',preds:'C,D',dur:'7'}
  ]},
  { label: 'Evento', data: [
    {id:'A',nombre:'Planificación',preds:'',dur:'5'},{id:'B',nombre:'Logística',preds:'A',dur:'3'},
    {id:'C',nombre:'Invitaciones',preds:'A',dur:'2'},{id:'D',nombre:'Catering',preds:'B',dur:'4'},
    {id:'E',nombre:'Decoración',preds:'B,C',dur:'3'},{id:'F',nombre:'Ejecución',preds:'D,E',dur:'1'}
  ]},
]

const DEFAULTS: Actividad[] = [
  {id:'A',nombre:'Diseño',preds:'',dur:'4'},
  {id:'B',nombre:'Desarrollo',preds:'A',dur:'6'},
  {id:'C',nombre:'Pruebas',preds:'A',dur:'3'},
  {id:'D',nombre:'Documentación',preds:'B',dur:'2'},
  {id:'E',nombre:'Despliegue',preds:'C,D',dur:'5'},
]

function drawGantt(canvas: HTMLCanvasElement, res: CPMResult, isDark: boolean) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const LEFT = 120, TOP = 28, BOTTOM = 28
  const chartW = W - LEFT - 20
  const rowH = (H - TOP - BOTTOM) / res.nodos.length
  const dur = res.duracion_proyecto
  const critSet = new Set(res.ruta_critica)
  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc'; ctx.fillRect(0,0,W,H)
  const ticks = Math.min(dur, 12)
  const step = Math.ceil(dur / ticks)
  ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0'; ctx.lineWidth = 1
  for (let t = 0; t <= dur; t += step) {
    const x = LEFT + (t/dur) * chartW
    ctx.beginPath(); ctx.moveTo(x, TOP-6); ctx.lineTo(x, H-BOTTOM); ctx.stroke()
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(String(t), x, TOP-8)
  }
  ctx.fillStyle = isDark ? '#64748b' : '#475569'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('Tiempo', LEFT + chartW/2, H-8)
  res.nodos.forEach((n, i) => {
    const y = TOP + i * rowH
    const isCrit = critSet.has(n.id)
    const barColor  = isCrit ? '#dc2626' : '#6366f1'
    const floatColor = isCrit ? '#fca5a5' : '#cbd5e1'
    ctx.fillStyle = i%2===0 ? (isDark?'#0f172a':'#f8fafc') : (isDark?'#1e293b':'white')
    ctx.fillRect(LEFT, y, chartW, rowH)
    if (n.LF > n.EF) {
      const xFloat = LEFT + (n.EF/dur)*chartW, wFloat = ((n.LF-n.EF)/dur)*chartW
      ctx.fillStyle = floatColor
      ctx.fillRect(xFloat, y+rowH*0.3, wFloat, rowH*0.4)
    }
    const xBar = LEFT + (n.ES/dur)*chartW, wBar = Math.max(((n.EF-n.ES)/dur)*chartW, 4)
    ctx.fillStyle = barColor
    ctx.fillRect(xBar, y+rowH*0.2, wBar, rowH*0.6)
    if (wBar > 28) {
      ctx.fillStyle = 'white'; ctx.font = 'bold 10px Inter,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(String(n.duracion), xBar+wBar/2, y+rowH*0.2+rowH*0.6/2+3.5)
    }
    ctx.fillStyle = isCrit ? '#dc2626' : (isDark?'#94a3b8':'#334155')
    ctx.font = (isCrit?'bold ':'') + '11px Inter,sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(`${n.id} \u2013 ${n.nombre}`, LEFT-6, y+rowH/2+4)
    ctx.strokeStyle = isDark?'#1e293b':'#f1f5f9'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(LEFT, y+rowH); ctx.lineTo(W-10, y+rowH); ctx.stroke()
  })
  ctx.strokeStyle = isDark?'#334155':'#e2e8f0'; ctx.lineWidth = 1.5
  ctx.strokeRect(LEFT, TOP, chartW, H-TOP-BOTTOM)
}

function drawNetwork(canvas: HTMLCanvasElement, res: CPMResult, isDark: boolean) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = isDark?'#0f172a':'#f8fafc'; ctx.fillRect(0,0,W,H)
  const levels: Record<string,number> = {}
  function getLevel(id: string): number {
    if (levels[id] !== undefined) return levels[id]
    const preds = res.edges.filter(e=>e.to===id).map(e=>e.from)
    if (!preds.length) { levels[id]=0; return 0 }
    levels[id] = Math.max(...preds.map(p=>getLevel(p)))+1
    return levels[id]
  }
  res.nodos.forEach(n=>getLevel(n.id))
  const maxLevel = Math.max(...Object.values(levels))
  const levelGroups: Record<number,string[]> = {}
  res.nodos.forEach(n=>{ const l=levels[n.id]; if(!levelGroups[l]) levelGroups[l]=[]; levelGroups[l].push(n.id) })
  const PAD=40, positions: Record<string,{x:number;y:number}> = {}
  const levelW = (W-PAD*2)/(maxLevel+1)
  Object.entries(levelGroups).forEach(([l,ids])=>{
    const x = PAD+parseInt(l)*levelW+levelW/2
    ids.forEach((id,idx)=>{ positions[id]={x, y:PAD+(idx+1)*(H-PAD*2)/(ids.length+1)} })
  })
  const critSet = new Set(res.ruta_critica); const R=19
  res.edges.forEach(e=>{
    const from=positions[e.from],to=positions[e.to]; if(!from||!to) return
    const isCrit=critSet.has(e.from)&&critSet.has(e.to)
    ctx.strokeStyle=isCrit?'#6366f1':(isDark?'#334155':'#cbd5e1'); ctx.lineWidth=isCrit?2.5:1.5
    ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke()
    const angle=Math.atan2(to.y-from.y,to.x-from.x)
    const ax=to.x-(R+4)*Math.cos(angle), ay=to.y-(R+4)*Math.sin(angle)
    ctx.fillStyle=isCrit?'#6366f1':(isDark?'#334155':'#cbd5e1')
    ctx.beginPath(); ctx.moveTo(ax,ay)
    ctx.lineTo(ax-7*Math.cos(angle-.4),ay-7*Math.sin(angle-.4))
    ctx.lineTo(ax-7*Math.cos(angle+.4),ay-7*Math.sin(angle+.4))
    ctx.closePath(); ctx.fill()
  })
  res.nodos.forEach(n=>{
    const p=positions[n.id]; if(!p) return
    const isCrit=critSet.has(n.id)
    ctx.fillStyle=isCrit?'#6366f1':(isDark?'#1e293b':'white')
    ctx.strokeStyle=isCrit?'#6366f1':(isDark?'#475569':'#cbd5e1'); ctx.lineWidth=isCrit?2:1.5
    ctx.beginPath(); ctx.arc(p.x,p.y,R,0,Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.fillStyle=isCrit?'white':(isDark?'#e2e8f0':'#334155')
    ctx.font='bold 12px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(n.id,p.x,p.y)
    ctx.font='9.5px Inter,sans-serif'; ctx.textBaseline='alphabetic'
    ctx.fillStyle=isDark?'#64748b':'#64748b'
    ctx.fillText(`${n.ES}|${n.EF}`,p.x,p.y+R+12)
  })
  ctx.textBaseline='alphabetic'
}

export function CpmPage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [modo, setModo] = useState('cpm')
  const [actividades, setActividades] = useState<Actividad[]>(DEFAULTS)
  const [result, setResult] = useState<CPMResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ganttRef = useRef<HTMLCanvasElement>(null)
  const netRef = useRef<HTMLCanvasElement>(null)
  const [fechaObjetivo, setFechaObjetivo] = useState('')
  const history = getHistory('cpm')
  const isDark = document.documentElement.classList.contains('dark')

  // Datos de la curva normal PERT
  const pertChart = useMemo(() => {
    if (!result || !result.desv_proyecto || result.desv_proyecto <= 0) return null
    const mu = result.duracion_proyecto
    const sigma = result.desv_proyecto
    const objetivo = parseFloat(fechaObjetivo)
    const tieneObjetivo = !isNaN(objetivo)
    const lo = mu - 4 * sigma, hi = mu + 4 * sigma
    const N = 80
    const data = Array.from({ length: N + 1 }, (_, i) => {
      const x = lo + (hi - lo) * (i / N)
      const d = normalPDF(x, mu, sigma)
      return {
        t: Math.round(x * 100) / 100,
        densidad: d,
        area: tieneObjetivo && x <= objetivo ? d : null as number | null,
      }
    })
    const prob = tieneObjetivo ? normalCDF(objetivo, mu, sigma) : null
    return { data, mu, sigma, objetivo, tieneObjetivo, prob }
  }, [result, fechaObjetivo])

  useEffect(() => {
    if (result && ganttRef.current && netRef.current) {
      drawGantt(ganttRef.current, result, isDark)
      drawNetwork(netRef.current, result, isDark)
    }
  }, [result, isDark])

  const addActividad = () => setActividades(a => [...a, { id:'', nombre:'', preds:'', dur:'1' }])
  const removeActividad = (i: number) => setActividades(a => a.filter((_,idx)=>idx!==i))
  const updateAct = (i: number, field: keyof Actividad, val: string) =>
    setActividades(a => a.map((act,idx)=>idx===i ? {...act,[field]:val} : act))

  const loadExample = useCallback((data: unknown) => {
    const d = data as Actividad[]
    setActividades(d.map(a => ({...a, opt:a.opt??'', prob:a.prob??'', pes:a.pes??''})))
    setResult(null); showToast('Ejemplo cargado','info')
  }, [])

  const handleResolve = async () => {
    const acts = actividades.map(a => {
      const act: Record<string,unknown> = {
        id: a.id.trim().toUpperCase(),
        nombre: a.nombre.trim() || a.id.trim().toUpperCase(),
        predecesoras: a.preds ? a.preds.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean) : [],
      }
      if (modo === 'cpm') { act.duracion = parseFloat(a.dur) }
      else { act.optimista = parseFloat(a.opt??'1'); act.probable = parseFloat(a.prob??'3'); act.pesimista = parseFloat(a.pes??'5') }
      return act
    })
    if (acts.some(a=>!a.id)) return showToast('Todas las actividades deben tener ID','error')
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiPost<CPMResult>('/cpm/resolver', { actividades:acts, modo })
      setResult(res)
      saveHistory('cpm', `Duración: ${res.duracion_proyecto} · Ruta: ${res.ruta_critica.join('→')}`, actividades)
      showToast(`Ruta crítica: ${res.ruta_critica.join(' → ')}`, 'success')
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg); showToast(msg,'error')
    } finally { setLoading(false) }
  }

  const nAct = result?.nodos.length ?? 0
  const ganttH = Math.max(180, nAct * 38 + 50)

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-4">
        <SectionCard title="Modo de análisis">
          <Select value={modo} onChange={(e: any) =>setModo(e.target.value)}>
            <option value="cpm">CPM — Duración determinista</option>
            <option value="pert">PERT — Tiempos probabilísticos</option>
          </Select>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
            {history.length>0 && <HistoryDropdown history={history} onLoad={loadExample} onClear={()=>clearHistory('cpm')} />}
          </div>
        </SectionCard>

        <SectionCard title="Actividades">
          <div className="flex flex-col gap-2">
            {actividades.map((act,i)=>(
              <div key={i} className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <input value={act.id} onChange={(e: any) =>updateAct(i,'id',e.target.value.toUpperCase())} maxLength={4}
                  placeholder="ID" className="io-input w-10 text-center text-xs font-bold uppercase" />
                <input value={act.nombre} onChange={(e: any) =>updateAct(i,'nombre',e.target.value)}
                  placeholder="Nombre de actividad" className="io-input flex-1 min-w-[100px] text-xs" />
                <input value={act.preds} onChange={(e: any) =>updateAct(i,'preds',e.target.value)}
                  placeholder="Preds: A,B" className="io-input w-20 text-xs" />
                {modo==='cpm' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">Dur:</span>
                    <input type="number" value={act.dur} onChange={(e: any) =>updateAct(i,'dur',e.target.value)}
                      className="io-input w-12 text-center text-xs" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-slate-400">O:</span>
                    <input type="number" value={act.opt??''} onChange={(e: any) =>updateAct(i,'opt',e.target.value)} className="io-input w-11 text-center text-xs" />
                    <span className="text-xs text-slate-400">M:</span>
                    <input type="number" value={act.prob??''} onChange={(e: any) =>updateAct(i,'prob',e.target.value)} className="io-input w-11 text-center text-xs" />
                    <span className="text-xs text-slate-400">P:</span>
                    <input type="number" value={act.pes??''} onChange={(e: any) =>updateAct(i,'pes',e.target.value)} className="io-input w-11 text-center text-xs" />
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={()=>removeActividad(i)}>×</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addActividad} className="mt-1">+ Agregar actividad</Button>
        </SectionCard>

        <PrimaryButton onClick={handleResolve} loading={loading}>
          {loading ? 'Calculando...' : '▶ Resolver'}
        </PrimaryButton>
      </div>

      <div className="flex flex-col gap-4">
        {!result && !loading && !error && (
          <div className="section-card items-center py-12 text-slate-300 dark:text-slate-600 gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <p className="text-sm">Define las actividades y presiona Resolver</p>
          </div>
        )}
        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <SectionCard title="Resultado">
              <div className="flex gap-3 flex-wrap">
                <StatCard label="Duración total" value={result.duracion_proyecto} sub="unidades de tiempo" accent />
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3.5 min-w-[160px]">
                  <p className="text-xs text-slate-400 font-medium mb-1">Ruta crítica</p>
                  <p className="text-base font-bold text-red-600 dark:text-red-400 leading-tight">
                    {result.ruta_critica.join(' → ')}
                  </p>
                </div>
                {result.desv_proyecto && result.desv_proyecto > 0 && (
                  <StatCard label="σ proyecto (PERT)" value={result.desv_proyecto} />
                )}
              </div>
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            {pertChart && (
              <SectionCard title="Distribución PERT del proyecto">
                <div className="flex items-end gap-3 flex-wrap mb-1">
                  <Input
                    label="Fecha objetivo (tiempo de entrega)"
                    type="number"
                    value={fechaObjetivo}
                    onChange={(e: any) => setFechaObjetivo(e.target.value)}
                    placeholder={`p. ej. ${Math.ceil(pertChart.mu)}`}
                    className="w-44"
                  />
                  {pertChart.tieneObjetivo && pertChart.prob !== null && (
                    <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 rounded-lg px-4 py-2.5">
                      <div className="text-xs text-slate-400 font-medium">
                        P(terminar en ≤ {pertChart.objetivo})
                      </div>
                      <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 font-mono tabular-nums leading-tight">
                        {(pertChart.prob * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pertChart.data} margin={{ top: 10, right: 16, bottom: 8, left: -8 }}>
                      <defs>
                        <linearGradient id="pertFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="pertArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="t" tick={{ fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' }}
                        label={{ value: 'Duración (tiempo)', position: 'insideBottom', offset: -4, fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? '#1e293b' : 'white',
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          borderRadius: 8, fontSize: 12,
                        }}
                        labelFormatter={(v) => `t = ${v}`}
                        formatter={(val: number) => [val.toFixed(4), 'densidad']}
                      />
                      <Area type="monotone" dataKey="densidad" stroke="#6366f1" strokeWidth={2} fill="url(#pertFill)" isAnimationActive />
                      {pertChart.tieneObjetivo && (
                        <Area type="monotone" dataKey="area" stroke="#f59e0b" strokeWidth={0} fill="url(#pertArea)" isAnimationActive={false} connectNulls={false} />
                      )}
                      <ReferenceLine x={Math.round(pertChart.mu * 100) / 100} stroke="#6366f1" strokeDasharray="4 3"
                        label={{ value: `μ=${Math.round(pertChart.mu * 100) / 100}`, fontSize: 10, fill: '#6366f1', position: 'top' }} />
                      {pertChart.tieneObjetivo && (
                        <ReferenceLine x={pertChart.objetivo} stroke="#f59e0b" strokeWidth={1.5}
                          label={{ value: 'objetivo', fontSize: 10, fill: '#b45309', position: 'top' }} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400">
                  La duración del proyecto sigue una normal con media μ = {Math.round(pertChart.mu * 100) / 100} y
                  desviación σ = {Math.round(pertChart.sigma * 1000) / 1000}. El área sombreada en ámbar es la
                  probabilidad de terminar dentro de la fecha objetivo.
                </p>
              </SectionCard>
            )}

            <SectionCard title="Diagrama de Gantt">
              <div className="flex gap-3 text-xs text-slate-400 mb-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" /> Actividad (ES→EF)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" /> Flotación
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Ruta crítica
                </span>
              </div>
              <canvas ref={ganttRef} width={700} height={ganttH} className="w-full rounded-lg border border-slate-100 dark:border-slate-700" />
            </SectionCard>

            <SectionCard title="Diagrama de red">
              <canvas ref={netRef} width={700} height={260} className="w-full rounded-lg border border-slate-100 dark:border-slate-700" />
            </SectionCard>

            <SectionCard title="Tabla de actividades">
              <div className="overflow-x-auto">
                <table className="io-table text-xs">
                  <thead>
                    <tr>
                      {['ID','Nombre','Dur','ES','EF','LS','LF','Holgura'].map(h=><th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.nodos.map(n=>(
                      <tr key={n.id} className={n.critica?'':''}
                        style={n.critica?{background:undefined}:undefined}>
                        <td className={`font-bold font-mono ${n.critica?'text-red-600 dark:text-red-400':''}`}>{n.id}</td>
                        <td className="text-left">{n.nombre}</td>
                        <td>{n.duracion}</td><td>{n.ES}</td><td>{n.EF}</td>
                        <td>{n.LS}</td><td>{n.LF}</td>
                        <td className={`font-bold ${n.holgura===0?'text-red-600 dark:text-red-400':'text-green-600 dark:text-green-400'}`}>
                          {n.holgura}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  )
}
