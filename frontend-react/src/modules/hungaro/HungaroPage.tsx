import { useState, useCallback } from 'react'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, StepsPanel, LoadingCard, ErrorCard } from '../../components/shared/SharedComponents'
import { Button, PrimaryButton, Select, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

interface HungaroResult {
  costo_total: number
  asignacion: [number,number][]
  pasos: string[]
  interpretacion: string
  tipo: string
}

const EXAMPLES = [
  { label: '4×4 clásico',   data: { n:4, tipo:'min', costos:[[9,2,7,8],[6,4,3,7],[5,8,1,8],[7,6,9,4]] } },
  { label: '3×3 beneficio', data: { n:3, tipo:'max', costos:[[9,3,6],[5,9,4],[8,7,9]] } },
  { label: '4×4 trabajos',  data: { n:4, tipo:'min', costos:[[15,18,21,12],[9,16,17,14],[12,14,18,13],[7,9,11,8]] } },
]

export function HungaroPage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [n, setN] = useState(4)
  const [tipo, setTipo] = useState('min')
  const [costos, setCostos] = useState<number[][]>([[9,2,7,8],[6,4,3,7],[5,8,1,8],[7,6,9,4]])
  const [result, setResult] = useState<HungaroResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const history = getHistory('hungaro')

  const buildMatrix = (size: number, data?: number[][]) =>
    Array.from({length:size}, (_,i) => Array.from({length:size}, (_,j) => data?.[i]?.[j] ?? 1))

  const loadExample = useCallback((data: unknown) => {
    const d = data as { n:number; tipo:string; costos:number[][] }
    setN(d.n); setTipo(d.tipo); setCostos(buildMatrix(d.n,d.costos)); setResult(null)
    showToast('Ejemplo cargado','info')
  }, [])

  const handleResolve = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiPost<HungaroResult>('/hungaro/resolver',{costos,tipo})
      setResult(res)
      saveHistory('hungaro',`${tipo==='min'?'Costo':'Beneficio'} = ${res.costo_total}`,{n,tipo,costos})
      showToast(`${tipo==='min'?'Costo mínimo':'Beneficio máximo'}: ${res.costo_total}`,'success')
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg); showToast(msg,'error')
    } finally { setLoading(false) }
  }

  const asigSet = result ? new Set(result.asignacion.map(([i,j])=>`${i},${j}`)) : new Set()

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-4">
        <SectionCard title="Configuración">
          <div className="flex gap-2.5 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tamaño n×n</label>
              <input type="number" min={2} max={8} value={n}
                onChange={(e: any) =>setN(parseInt(e.target.value)||n)}
                className="io-input w-20" />
            </div>
            <Select label="Criterio" value={tipo} onChange={(e: any) =>setTipo(e.target.value)} className="flex-1">
              <option value="min">Minimizar costo</option>
              <option value="max">Maximizar beneficio</option>
            </Select>
            <Button onClick={()=>setCostos(buildMatrix(n))}>Generar</Button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
            <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
            {history.length > 0 && <HistoryDropdown history={history} onLoad={loadExample} onClear={()=>clearHistory('hungaro')} />}
          </div>
        </SectionCard>

        <SectionCard title="Matriz de costos / beneficios">
          <div className="overflow-x-auto">
            <table className="io-table text-xs">
              <thead>
                <tr>
                  <th></th>
                  {Array.from({length:n},(_,j)=><th key={j}>T{j+1}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({length:n},(_,i)=>(
                  <tr key={i}>
                    <th className="bg-slate-50 dark:bg-slate-800">A{i+1}</th>
                    {Array.from({length:n},(_,j)=>(
                      <td key={j}>
                        <input type="number" value={costos[i]?.[j]??1}
                          onChange={(e: any) =>setCostos(c=>c.map((r,ri)=>ri===i?r.map((v,ci)=>ci===j?Number(e.target.value):v):r))}
                          className="w-12 text-center bg-transparent outline-none font-mono" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <PrimaryButton onClick={handleResolve} loading={loading}>
          {loading ? 'Calculando...' : '▶ Resolver'}
        </PrimaryButton>
      </div>

      <div className="flex flex-col gap-4">
        {!result && !loading && !error && (
          <div className="section-card items-center py-12 text-slate-300 dark:text-slate-600 gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-sm">Configura la matriz y presiona Resolver</p>
          </div>
        )}
        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <SectionCard title="Resultado">
              <StatCard label={result.tipo==='min'?'Costo mínimo':'Beneficio máximo'} value={result.costo_total} accent />
              <div className="overflow-x-auto">
                <table className="io-table text-xs">
                  <thead><tr><th></th>{Array.from({length:n},(_,j)=><th key={j}>T{j+1}</th>)}</tr></thead>
                  <tbody>
                    {costos.map((row,i)=>(
                      <tr key={i}>
                        <th className="bg-slate-50 dark:bg-slate-800">A{i+1}</th>
                        {row.map((v,j)=>{
                          const sel = asigSet.has(`${i},${j}`)
                          return <td key={j} className={sel?'highlight':''}>
                            {v}{sel&&<span className="block text-[10px]">✓</span>}
                          </td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            {result.pasos?.length > 0 && (
              <SectionCard title="Procedimiento (Método Húngaro)">
                <StepsPanel pasos={result.pasos} />
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
