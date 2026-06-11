import { useState, useCallback, useRef, useEffect } from 'react'
import { Route } from 'lucide-react'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, StepsPanel, LoadingCard, ErrorCard, PdfButton } from '../../components/shared/SharedComponents'
import { Button, PrimaryButton, Input, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

interface AristaIn { from: string; to: string; peso: string }
interface DijkstraResult {
  ruta: string[]
  distancia: number
  aristas_ruta: { from: string; to: string }[]
  distancias: Record<string, number | null>
  posiciones: Record<string, { x: number; y: number }>
  aristas: { from: string; to: string; peso: number }[]
  dirigido: boolean
  pasos: { titulo: string; detalle: string }[]
  interpretacion: string
}

const EXAMPLES = [
  { label: 'Red clásica', data: {
    nodos: 'A,B,C,D,E',
    aristas: [
      { from:'A', to:'B', peso:'4' }, { from:'A', to:'C', peso:'2' },
      { from:'C', to:'B', peso:'1' }, { from:'B', to:'D', peso:'5' },
      { from:'C', to:'D', peso:'8' }, { from:'D', to:'E', peso:'3' },
    ], origen:'A', destino:'E', dirigido:false,
  }},
  { label: 'Ciudades', data: {
    nodos: 'Origen,N1,N2,N3,N4,Destino',
    aristas: [
      { from:'Origen', to:'N1', peso:'7' }, { from:'Origen', to:'N2', peso:'9' },
      { from:'Origen', to:'N3', peso:'14' }, { from:'N1', to:'N2', peso:'10' },
      { from:'N1', to:'N4', peso:'15' }, { from:'N2', to:'N3', peso:'2' },
      { from:'N2', to:'N4', peso:'11' }, { from:'N3', to:'Destino', peso:'9' },
      { from:'N4', to:'Destino', peso:'6' },
    ], origen:'Origen', destino:'Destino', dirigido:false,
  }},
]

function drawGraph(canvas: HTMLCanvasElement, res: DijkstraResult, isDark: boolean) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height, PAD = 44
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc'; ctx.fillRect(0, 0, W, H)

  const xs = Object.values(res.posiciones).map(p => p.x)
  const ys = Object.values(res.posiciones).map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const tx = (x: number) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2)
  const ty = (y: number) => PAD + ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2)

  const rutaSet = new Set(res.aristas_ruta.map(e => `${e.from}|${e.to}`).concat(res.aristas_ruta.map(e => `${e.to}|${e.from}`)))
  const R = 20

  // Aristas
  res.aristas.forEach(e => {
    const p1 = res.posiciones[e.from], p2 = res.posiciones[e.to]
    if (!p1 || !p2) return
    const x1 = tx(p1.x), y1 = ty(p1.y), x2 = tx(p2.x), y2 = ty(p2.y)
    const enRuta = rutaSet.has(`${e.from}|${e.to}`)
    ctx.strokeStyle = enRuta ? '#6366f1' : (isDark ? '#334155' : '#cbd5e1')
    ctx.lineWidth = enRuta ? 3 : 1.5
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    // Etiqueta de peso
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    ctx.fillStyle = isDark ? '#1e293b' : 'white'
    ctx.fillRect(mx - 11, my - 9, 22, 18)
    ctx.fillStyle = enRuta ? '#6366f1' : (isDark ? '#94a3b8' : '#64748b')
    ctx.font = 'bold 11px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(e.peso), mx, my)
  })

  // Nodos
  Object.entries(res.posiciones).forEach(([id, p]) => {
    const x = tx(p.x), y = ty(p.y)
    const esOrigen = id === res.ruta[0]
    const esDestino = id === res.ruta[res.ruta.length - 1]
    const enRuta = res.ruta.includes(id)
    let fill = isDark ? '#1e293b' : 'white'
    let stroke = isDark ? '#475569' : '#cbd5e1'
    if (esOrigen || esDestino) { fill = '#6366f1'; stroke = '#6366f1' }
    else if (enRuta) { fill = isDark ? '#312e81' : '#e0e7ff'; stroke = '#6366f1' }
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = enRuta ? 2.5 : 1.5
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = (esOrigen || esDestino) ? 'white' : (isDark ? '#e2e8f0' : '#334155')
    ctx.font = 'bold 12px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const label = id.length > 4 ? id.slice(0, 4) : id
    ctx.fillText(label, x, y)
    // distancia
    const d = res.distancias[id]
    if (d !== null && d !== undefined) {
      ctx.fillStyle = '#6366f1'; ctx.font = '9.5px Inter,sans-serif'
      ctx.fillText(`d=${d}`, x, y + R + 11)
    }
  })
  ctx.textBaseline = 'alphabetic'
}

export function DijkstraPage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [nodosStr, setNodosStr] = useState('A,B,C,D,E')
  const [aristas, setAristas] = useState<AristaIn[]>(EXAMPLES[0].data.aristas)
  const [origen, setOrigen] = useState('A')
  const [destino, setDestino] = useState('E')
  const [dirigido, setDirigido] = useState(false)
  const [result, setResult] = useState<DijkstraResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<HTMLDivElement>(null)
  const history = getHistory('dijkstra')
  const isDark = document.documentElement.classList.contains('dark')

  const nodos = nodosStr.split(',').map(s => s.trim()).filter(Boolean)

  useEffect(() => {
    if (result && canvasRef.current) drawGraph(canvasRef.current, result, isDark)
  }, [result, isDark])

  const addArista = () => setAristas(a => [...a, { from: nodos[0] ?? '', to: nodos[1] ?? '', peso: '1' }])
  const removeArista = (i: number) => setAristas(a => a.filter((_, idx) => idx !== i))
  const updateArista = (i: number, field: keyof AristaIn, val: string) =>
    setAristas(a => a.map((ar, idx) => idx === i ? { ...ar, [field]: val } : ar))

  const loadExample = useCallback((data: unknown) => {
    const d = data as typeof EXAMPLES[0]['data']
    setNodosStr(d.nodos); setAristas(d.aristas); setOrigen(d.origen); setDestino(d.destino); setDirigido(d.dirigido)
    setResult(null); showToast('Ejemplo cargado', 'info')
  }, [])

  const handleResolve = async () => {
    if (nodos.length < 2) return showToast('Define al menos 2 nodos', 'error')
    const ar = aristas.map(a => ({ from: a.from.trim(), to: a.to.trim(), peso: parseFloat(a.peso) }))
    if (ar.some(a => !a.from || !a.to || isNaN(a.peso))) return showToast('Revisa las aristas (origen, destino y peso)', 'error')
    if (ar.some(a => a.peso < 0)) return showToast('Dijkstra requiere pesos no negativos', 'error')
    if (!nodos.includes(origen) || !nodos.includes(destino)) return showToast('Origen y destino deben ser nodos válidos', 'error')
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiPost<DijkstraResult & { error?: string }>('/dijkstra/resolver', { nodos, aristas: ar, origen, destino, dirigido })
      if (res.error) { setError(res.error); showToast(res.error, 'error'); return }
      setResult(res)
      saveHistory('dijkstra', `${origen}→${destino}: ${res.distancia} (${res.ruta.join('→')})`, { nodos: nodosStr, aristas, origen, destino, dirigido })
      showToast(`Ruta más corta: ${res.distancia}`, 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg); showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-4">
        <SectionCard title="Nodos y configuración">
          <Input label="Nodos (separados por comas)" value={nodosStr} onChange={(e: any) => setNodosStr(e.target.value)} placeholder="A,B,C,D,E" />
          <div className="flex gap-2.5 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Origen</label>
              <select value={origen} onChange={(e: any) => setOrigen(e.target.value)} className="io-input">
                {nodos.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Destino</label>
              <select value={destino} onChange={(e: any) => setDestino(e.target.value)} className="io-input">
                {nodos.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 pb-1.5 cursor-pointer">
              <input type="checkbox" checked={dirigido} onChange={(e: any) => setDirigido(e.target.checked)} className="accent-brand-500" />
              Dirigido
            </label>
          </div>
          <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
        </SectionCard>

        <SectionCard title="Aristas (conexiones)" actions={
          history.length > 0 ? <HistoryDropdown history={history} onLoad={loadExample} onClear={() => clearHistory('dijkstra')} /> : undefined
        }>
          <div className="flex flex-col gap-2">
            {aristas.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                <select value={a.from} onChange={(e: any) => updateArista(i, 'from', e.target.value)} className="io-input w-20">
                  {nodos.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-slate-400">{dirigido ? '→' : '—'}</span>
                <select value={a.to} onChange={(e: any) => updateArista(i, 'to', e.target.value)} className="io-input w-20">
                  {nodos.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-slate-400">peso</span>
                <input type="number" value={a.peso} onChange={(e: any) => updateArista(i, 'peso', e.target.value)} className="io-input w-16 text-center" />
                <Button variant="ghost" size="sm" onClick={() => removeArista(i)}>×</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addArista} className="mt-1">+ Agregar arista</Button>
        </SectionCard>

        <PrimaryButton onClick={handleResolve} loading={loading}>
          {loading ? 'Calculando...' : '▶ Resolver'}
        </PrimaryButton>
      </div>

      <div className="flex flex-col gap-4">
        {!result && !loading && !error && (
          <div className="section-card items-center py-12 text-slate-300 dark:text-slate-600 gap-3">
            <Route className="w-10 h-10" strokeWidth={1.5} />
            <p className="text-sm">Define el grafo y presiona Resolver</p>
          </div>
        )}
        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div ref={pdfRef} className="flex flex-col gap-4 animate-slide-up">
            <SectionCard title="Ruta más corta" actions={<PdfButton targetRef={pdfRef} filename="dijkstra.pdf" titulo="Ruta más corta (Dijkstra)" />}>
              <div className="flex gap-3 flex-wrap items-stretch">
                <StatCard label="Distancia total" value={result.distancia} accent />
                <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 rounded-lg px-4 py-3.5 flex-1 min-w-[180px]">
                  <p className="text-xs text-slate-400 font-medium mb-1">Ruta óptima</p>
                  <p className="text-base font-bold text-brand-600 dark:text-brand-400 leading-tight">
                    {result.ruta.join(' → ')}
                  </p>
                </div>
              </div>
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            <SectionCard title="Grafo">
              <div className="flex gap-3 text-xs text-slate-400 mb-1 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-500 inline-block" /> Origen / Destino</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-brand-500 inline-block" /> Ruta más corta</span>
              </div>
              <canvas ref={canvasRef} width={700} height={380} className="w-full rounded-lg border border-slate-100 dark:border-slate-700" />
            </SectionCard>

            <SectionCard title="Distancias mínimas desde el origen">
              <div className="overflow-x-auto">
                <table className="io-table">
                  <thead><tr><th>Nodo</th>{nodos.map(n => <th key={n}>{n}</th>)}</tr></thead>
                  <tbody>
                    <tr>
                      <td className="font-semibold bg-slate-50 dark:bg-slate-800">Distancia</td>
                      {nodos.map(n => (
                        <td key={n} className={result.ruta.includes(n) ? 'highlight' : ''}>
                          {result.distancias[n] ?? '∞'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {result.pasos?.length > 0 && (
              <SectionCard title="Procedimiento (etiquetado de Dijkstra)">
                <StepsPanel pasos={result.pasos} />
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
