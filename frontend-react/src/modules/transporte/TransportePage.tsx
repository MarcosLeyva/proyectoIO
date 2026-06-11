import { useState, useCallback } from 'react'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, StepsPanel, LoadingCard, ErrorCard } from '../../components/shared/SharedComponents'
import { Button, PrimaryButton, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

interface TransporteResult {
  costo: number
  asignacion: number[][]
  pasos: string[]
  interpretacion: string
  balanceo?: string
}

const EXAMPLES = [
  { label: 'Clásico 3×4', data: { m:3,n:4,costos:[[2,3,1,4],[5,4,8,1],[5,6,8,2]],oferta:[30,40,50],demanda:[20,30,10,60] } },
  { label: 'Simple 2×3',  data: { m:2,n:3,costos:[[4,8,1],[7,2,3]],oferta:[120,80],demanda:[150,70,80] } },
  { label: 'Auto-balance', data: { m:3,n:3,costos:[[2,7,4],[3,3,1],[5,4,7]],oferta:[70,40,90],demanda:[80,60,50] } },
]

export function TransportePage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [m, setM] = useState(3)
  const [n, setN] = useState(4)
  const [costos, setCostos] = useState<number[][]>(Array.from({length:3},()=>Array(4).fill(1)))
  const [oferta, setOferta] = useState<number[]>(Array(3).fill(0))
  const [demanda, setDemanda] = useState<number[]>(Array(4).fill(0))
  const [result, setResult] = useState<TransporteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const history = getHistory('transporte')

  const generateTable = (nm: number, nn: number, data?: { costos:number[][];oferta:number[];demanda:number[] }) => {
    setM(nm); setN(nn)
    setCostos(data?.costos ?? Array.from({length:nm},()=>Array(nn).fill(1)))
    setOferta(data?.oferta ?? Array(nm).fill(0))
    setDemanda(data?.demanda ?? Array(nn).fill(0))
    setResult(null)
  }

  const loadExample = useCallback((data: unknown) => {
    const d = data as { m:number;n:number;costos:number[][];oferta:number[];demanda:number[] }
    generateTable(d.m, d.n, d); showToast('Ejemplo cargado', 'info')
  }, [])

  const sumOferta = oferta.reduce((a,b)=>a+b,0)
  const sumDemanda = demanda.reduce((a,b)=>a+b,0)
  const balanced = Math.abs(sumOferta - sumDemanda) < 1e-8

  const handleResolve = async () => {
    if (oferta.some(v=>v<=0)) return showToast('Oferta debe ser > 0','error')
    if (demanda.some(v=>v<=0)) return showToast('Demanda debe ser > 0','error')
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiPost<TransporteResult>('/transporte/resolver', {oferta,demanda,costos})
      setResult(res)
      saveHistory('transporte', `Costo = ${res.costo}`, {m,n,costos,oferta,demanda})
      showToast(`Costo mínimo: ${res.costo}`, 'success')
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg); showToast(msg,'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <SectionCard title="Dimensiones">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Orígenes (m)</label>
              <input type="number" min={2} max={8} value={m}
                onChange={(e: any) =>setM(parseInt(e.target.value)||m)}
                className="io-input w-20" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Destinos (n)</label>
              <input type="number" min={2} max={8} value={n}
                onChange={(e: any) =>setN(parseInt(e.target.value)||n)}
                className="io-input w-20" />
            </div>
            <Button onClick={()=>generateTable(m,n)}>Generar tabla</Button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
            <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
            {history.length > 0 && <HistoryDropdown history={history} onLoad={loadExample} onClear={()=>clearHistory('transporte')} />}
          </div>
          {(sumOferta > 0 || sumDemanda > 0) && (
            <div className="mt-1">
              {balanced
                ? <span className="badge badge-green">Balanceado — Oferta = Demanda = {sumOferta}</span>
                : <span className="badge badge-amber">Desbalanceado — Oferta {sumOferta} ≠ Demanda {sumDemanda} (se auto-balancea)</span>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Tabla de costos, oferta y demanda">
          <div className="overflow-x-auto">
            <table className="io-table text-xs">
              <thead>
                <tr>
                  <th className="bg-slate-50 dark:bg-slate-800">Orig / Dest</th>
                  {Array.from({length:n},(_,j)=><th key={j}>D{j+1}</th>)}
                  <th className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">Oferta</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({length:m},(_,i)=>(
                  <tr key={i}>
                    <th className="bg-slate-50 dark:bg-slate-800 font-medium">O{i+1}</th>
                    {Array.from({length:n},(_,j)=>(
                      <td key={j}>
                        <input type="number" value={costos[i]?.[j]??1} min={0}
                          onChange={(e: any) =>setCostos(c=>c.map((r,ri)=>ri===i?r.map((v,ci)=>ci===j?Number(e.target.value):v):r))}
                          className="w-12 text-center bg-transparent outline-none font-mono" />
                      </td>
                    ))}
                    <td className="bg-green-50 dark:bg-green-900/20">
                      <input type="number" value={oferta[i]??0} min={0}
                        onChange={(e: any) =>setOferta(o=>o.map((v,ii)=>ii===i?Number(e.target.value):v))}
                        className="w-14 text-center bg-transparent outline-none font-mono" />
                    </td>
                  </tr>
                ))}
                <tr>
                  <th className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Demanda</th>
                  {Array.from({length:n},(_,j)=>(
                    <td key={j} className="bg-blue-50/50 dark:bg-blue-900/10">
                      <input type="number" value={demanda[j]??0} min={0}
                        onChange={(e: any) =>setDemanda(d=>d.map((v,jj)=>jj===j?Number(e.target.value):v))}
                        className="w-12 text-center bg-transparent outline-none font-mono" />
                    </td>
                  ))}
                  <td />
                </tr>
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
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p className="text-sm">Genera la tabla y presiona Resolver</p>
          </div>
        )}
        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <SectionCard title="Resultado">
              <StatCard label="Costo mínimo total" value={result.costo} accent />
              {result.balanceo && <div className="alert-warn">{result.balanceo}</div>}
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            <SectionCard title="Asignación óptima">
              <div className="overflow-x-auto">
                <table className="io-table text-xs">
                  <thead><tr><th>Orig/Dest</th>{Array.from({length:result.asignacion[0]?.length??0},(_,j)=><th key={j}>D{j+1}</th>)}</tr></thead>
                  <tbody>
                    {result.asignacion.map((row,i)=>(
                      <tr key={i}>
                        <th className="bg-slate-50 dark:bg-slate-800">O{i+1}</th>
                        {row.map((v,j)=>(
                          <td key={j} className={v>0?'highlight':''}>
                            {v>0?v:'—'}
                            {costos[i]?.[j]!==undefined&&<span className="block text-[10px] text-slate-400">{costos[i][j]}</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {result.pasos?.length > 0 && (
              <SectionCard title="Procedimiento (Vogel + MODI)">
                <StepsPanel pasos={result.pasos} />
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
