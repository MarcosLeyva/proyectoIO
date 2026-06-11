import { useState, useCallback, useRef } from 'react'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, LoadingCard, ErrorCard, PdfButton } from '../../components/shared/SharedComponents'
import { Formulacion } from '../../components/shared/Formulacion'
import { SensibilidadPanel } from '../../components/shared/SensibilidadPanel'
import { Button, PrimaryButton, Input, Select, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

interface Restriccion { coefs: string[]; op: string; rhs: string }
interface SimplexResult {
  z: number
  solucion: Record<string, number>
  iteraciones: number
  tipo: string
  pasos: Array<{
    tableau: number[][]
    z_row: number[]
    base: string[]
  }>
  interpretacion: string
}

const EXAMPLES = [
  { label: '2 vars',    data: { nvars:2, tipo:'max', obj:[5,4],   rows:[{coefs:[6,4],op:'<=',rhs:24},{coefs:[1,2],op:'<=',rhs:6}] } },
  { label: '3 vars',    data: { nvars:3, tipo:'max', obj:[2,3,4], rows:[{coefs:[3,2,1],op:'<=',rhs:14},{coefs:[2,5,3],op:'<=',rhs:14},{coefs:[1,1,1],op:'<=',rhs:5}] } },
  { label: 'Gran M (≥)', data: { nvars:2, tipo:'min', obj:[2,3],   rows:[{coefs:[1,1],op:'>=',rhs:4},{coefs:[3,1],op:'>=',rhs:6}] } },
]

export function SimplexPage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [nvars, setNvars] = useState(2)
  const [tipo, setTipo] = useState('max')
  const [obj, setObj] = useState<string[]>(['5','4'])
  const [rows, setRows] = useState<Restriccion[]>([
    { coefs:['6','4'], op:'<=', rhs:'24' },
    { coefs:['1','2'], op:'<=', rhs:'6' },
  ])
  const [result, setResult] = useState<SimplexResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pdfRef = useRef<HTMLDivElement>(null)
  const history = getHistory('simplex')

  const buildEmptyRows = (n: number) => [
    { coefs: Array(n).fill('0'), op: '<=', rhs: '0' },
    { coefs: Array(n).fill('0'), op: '<=', rhs: '0' },
  ]

  const handleNvarsChange = (n: number) => {
    const clamp = Math.max(2, Math.min(8, n))
    setNvars(clamp)
    setObj(Array(clamp).fill('0'))
    setRows(buildEmptyRows(clamp))
    setResult(null)
  }

  const addRow = () => setRows(r => [...r, { coefs: Array(nvars).fill('0'), op: '<=', rhs: '0' }])
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i))
  const updateRowCoef = (ri: number, ci: number, val: string) =>
    setRows(r => r.map((row, idx) => idx === ri ? { ...row, coefs: row.coefs.map((c, j) => j === ci ? val : c) } : row))
  const updateRowOp = (ri: number, val: string) =>
    setRows(r => r.map((row, idx) => idx === ri ? { ...row, op: val } : row))
  const updateRowRhs = (ri: number, val: string) =>
    setRows(r => r.map((row, idx) => idx === ri ? { ...row, rhs: val } : row))

  const loadExample = useCallback((data: unknown) => {
    const d = data as { nvars:number; tipo:string; obj:number[]; rows:{coefs:number[]; op:string; rhs:number}[] }
    setNvars(d.nvars); setTipo(d.tipo)
    setObj(d.obj.map(String))
    setRows(d.rows.map(r => ({ coefs: r.coefs.map(String), op: r.op, rhs: String(r.rhs) })))
    setResult(null); showToast('Ejemplo cargado', 'info')
  }, [])

  const handleResolve = async () => {
    const objNums = obj.map(Number)
    if (objNums.some(isNaN)) return showToast('Coeficientes de la FO inválidos', 'error')
    const restricciones = rows.map(r => ({ coefs: r.coefs.map(Number), op: r.op, rhs: Number(r.rhs) }))
    if (restricciones.some(r => r.coefs.some(isNaN) || isNaN(r.rhs))) return showToast('Valores inválidos en restricciones', 'error')
    setLoading(true); setError(''); setResult(null); setStep(0)
    try {
      const res = await apiPost<SimplexResult>('/simplex/resolver', { obj: objNums, restricciones, tipo })
      setResult(res)
      const label = `Z=${res.z} · ${Object.entries(res.solucion).map(([k,v]) => `${k}=${v}`).join(', ')}`
      saveHistory('simplex', label, { nvars, tipo, obj: objNums, rows: restricciones })
      showToast('Solución óptima encontrada', 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg); showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const pasos = result?.pasos ?? []
  const currentStep = pasos[step]

  const renderTableau = () => {
    if (!currentStep) return null
    const { tableau, z_row, base } = currentStep
    const nCols = tableau[0]?.length ?? 0
    const zr = z_row.slice(0, -1)
    const pivCol = zr.indexOf(Math.min(...zr))
    const pivRow = tableau.reduce<number>((best, row, i) => {
      const el = row[pivCol]; if (el <= 1e-8) return best
      const ratio = row[row.length-1] / el
      if (best === -1) return i
      const br = tableau[best][tableau[best].length-1] / tableau[best][pivCol]
      return ratio < br ? i : best
    }, -1)
    const isOpt = zr.every(v => v >= -1e-8)

    return (
      <div className="animate-fade-in">
        <div className="overflow-x-auto">
          <table className="io-table text-xs">
            <thead>
              <tr>
                <th className="bg-slate-800 text-slate-300">Base</th>
                {Array.from({ length: nCols-1 }, (_, j) => (
                  <th key={j} className={j === pivCol && !isOpt ? 'bg-brand-500 text-white' : ''}>
                    col {j+1}
                  </th>
                ))}
                <th className="bg-slate-800 text-slate-300">RHS</th>
              </tr>
            </thead>
            <tbody>
              {tableau.map((row, i) => (
                <tr key={i} className={i === pivRow && !isOpt ? 'bg-amber-50 dark:bg-amber-900/20' : ''}>
                  <td className="font-semibold text-brand-500 bg-slate-50 dark:bg-slate-800">{base[i] ?? ''}</td>
                  {row.map((v, j) => (
                    <td key={j} className={
                      i===pivRow && j===pivCol && !isOpt ? 'pivot-cell' :
                      j===pivCol && i!==pivRow && !isOpt ? 'pivot-col' : ''
                    }>{v}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-amber-50 dark:bg-amber-900/10">
                <td className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30">Z</td>
                {z_row.map((v, j) => (
                  <td key={j} className={`font-semibold ${v < -1e-8 ? 'text-red-600 dark:text-red-400' : ''}`}>{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          {!isOpt && pivCol >= 0 && <span className="badge badge-blue">Entra: col {pivCol+1}</span>}
          {!isOpt && pivRow >= 0 && <span className="badge badge-amber">Sale: {base[pivRow] ?? ''}</span>}
          {isOpt && <span className="badge badge-green">✓ Solución óptima</span>}
        </div>
      </div>
    )
  }

  const vars = Array.from({ length: nvars }, (_, i) => `x${i+1}`)

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[380px_1fr]">
      {/* Form */}
      <div className="flex flex-col gap-4">
        <SectionCard title="Configuración">
          <div className="flex gap-2.5 items-end flex-wrap">
            <Input label="N° Variables" type="number" min={2} max={8} value={nvars}
              onChange={(e: any) => handleNvarsChange(parseInt(e.target.value))} className="w-20" />
            <Select label="Objetivo" value={tipo} onChange={(e: any) => setTipo(e.target.value)} className="flex-1">
              <option value="max">Maximizar</option>
              <option value="min">Minimizar</option>
            </Select>
            <Button onClick={() => handleNvarsChange(nvars)} size="md">Generar</Button>
          </div>
          <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
        </SectionCard>

        <SectionCard title="Función objetivo: Z =">
          <div className="flex flex-wrap gap-2 items-end">
            {vars.map((v, i) => (
              <div key={i} className="flex items-end gap-1">
                <Input label={v} type="number" value={obj[i] ?? '0'}
                  onChange={(e: any) => setObj(o => o.map((c, j) => j===i ? e.target.value : c))}
                  className="w-14 text-center" />
                {i < nvars-1 && <span className="text-slate-400 text-sm pb-2">+</span>}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Restricciones" actions={
          history.length > 0 ? <HistoryDropdown history={history} onLoad={loadExample} onClear={() => clearHistory('simplex')} /> : undefined
        }>
          <div className="flex flex-col gap-2">
            {rows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-1.5 flex-wrap py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                {vars.map((v, ci) => (
                  <span key={ci} className="flex items-center gap-1">
                    <input type="number" value={row.coefs[ci] ?? '0'}
                      onChange={(e: any) => updateRowCoef(ri, ci, e.target.value)}
                      className="io-input w-12 text-center" title={v} />
                    <span className="text-xs text-slate-400">{v}{ci < nvars-1 ? '+' : ''}</span>
                  </span>
                ))}
                <select value={row.op} onChange={(e: any) => updateRowOp(ri, e.target.value)} className="io-input w-14">
                  <option value="<=">≤</option><option value=">=">≥</option><option value="=">=</option>
                </select>
                <input type="number" value={row.rhs} onChange={(e: any) => updateRowRhs(ri, e.target.value)} className="io-input w-16 text-center" />
                <Button variant="ghost" size="sm" onClick={() => removeRow(ri)}>×</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addRow} className="mt-1">+ Agregar restricción</Button>
        </SectionCard>

        <PrimaryButton onClick={handleResolve} loading={loading}>
          {loading ? 'Calculando...' : '▶ Resolver'}
        </PrimaryButton>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-4">
        {!result && !loading && !error && (
          <div className="section-card items-center py-12 text-slate-300 dark:text-slate-600 gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>
            </svg>
            <p className="text-sm">Configura el problema y presiona Resolver</p>
          </div>
        )}
        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div ref={pdfRef} className="flex flex-col gap-4 animate-slide-up">
            <Formulacion tipo="pl" data={{
              obj: obj.map(Number),
              restricciones: rows.map(r => ({ coefs: r.coefs.map(Number), op: r.op, rhs: Number(r.rhs) })),
              tipo,
              variables: vars,
            }} />
            <SectionCard title="Solución óptima" actions={<PdfButton targetRef={pdfRef} filename="simplex.pdf" titulo="Método Simplex" />}>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(result.solucion).map(([k, v]) => (
                  <StatCard key={k} label={k} value={v} />
                ))}
                <StatCard label={`Z (${result.tipo === 'max' ? 'máx' : 'mín'})`} value={result.z} accent />
              </div>
              <p className="text-xs text-slate-400">Convergió en {result.iteraciones} iteración(es)</p>
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            <SensibilidadPanel
              obj={obj.map(Number)}
              restricciones={rows.map(r => ({ coefs: r.coefs.map(Number), op: r.op, rhs: Number(r.rhs) }))}
              tipo={tipo}
            />

            <SectionCard title={`Iteraciones — paso a paso (${pasos.length} total)`}>
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-700">
                <Button size="sm" onClick={() => setStep(0)} title="Primera">⏮</Button>
                <Button size="sm" onClick={() => setStep(s => Math.max(0, s-1))} title="Anterior">◀</Button>
                <Button size="sm" variant="primary" onClick={() => {
                  if (playing) {
                    if (playTimerRef.current) clearInterval(playTimerRef.current)
                    setPlaying(false)
                  } else {
                    setPlaying(true)
                    playTimerRef.current = setInterval(() => {
                      setStep(s => {
                        if (s >= pasos.length - 1) {
                          if (playTimerRef.current) clearInterval(playTimerRef.current)
                          setPlaying(false)
                          return s
                        }
                        return s + 1
                      })
                    }, 900)
                  }
                }}>
                  {playing ? '⏸ Pausar' : '▶ Reproducir'}
                </Button>
                <Button size="sm" onClick={() => setStep(s => Math.min(pasos.length-1, s+1))} title="Siguiente">▶</Button>
                <Button size="sm" onClick={() => setStep(pasos.length-1)} title="Última">⏭</Button>
                <span className="text-xs text-slate-400 ml-1">Iteración {step} de {pasos.length-1}</span>
              </div>
              {renderTableau()}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  )
}
