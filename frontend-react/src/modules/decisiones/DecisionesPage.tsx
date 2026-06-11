import { useState, useCallback } from 'react'
import { apiPost } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { SectionCard, StatCard, Interpretation, StepsPanel, LoadingCard, ErrorCard } from '../../components/shared/SharedComponents'
import { Button, PrimaryButton, Select, ExamplePills, HistoryDropdown, showToast } from '../../components/shared/FormControls'

interface VeipData { VEP: number; VEIP: number }
interface CriterioData { decision: string; valor: number; valores: number[]; alpha?: number; VEP?: number; VEIP?: number }

interface DecisionesResult {
  consenso: string
  resultados: Record<string, CriterioData>
  pasos: string[]
  interpretacion: string
}

const EXAMPLES = [
  { label: 'Inversiones', data: {
    na:3,ne:3,tipo:'max',
    alternativas:['Inversión A','Inversión B','Inversión C'],
    estados:['Demanda Alta','Demanda Media','Demanda Baja'],
    matriz:[[200,100,-50],[150,150,0],[100,100,100]], probs:['0.3','0.5','0.2']
  }},
  { label: 'Cosecha', data: {
    na:3,ne:3,tipo:'max',
    alternativas:['Plantar maíz','Plantar trigo','No plantar'],
    estados:['Lluvias altas','Lluvias medias','Sequía'],
    matriz:[[80,60,20],[70,55,30],[40,40,40]], probs:['','','']
  }},
  { label: 'Estrategia', data: {
    na:4,ne:3,tipo:'max',
    alternativas:['Expandir','Mantener','Reducir','Salir'],
    estados:['Auge','Normal','Recesión'],
    matriz:[[100,40,-20],[50,50,30],[10,10,10],[-10,20,40]], probs:['0.4','0.4','0.2']
  }},
]

export function DecisionesPage() {
  const { saveHistory, getHistory, clearHistory } = useStore()
  const [na, setNa] = useState(3)
  const [ne, setNe] = useState(3)
  const [tipo, setTipo] = useState('max')
  const [alpha, setAlpha] = useState(0.5)
  const [alternativas, setAlternativas] = useState(['Inversión A','Inversión B','Inversión C'])
  const [estados, setEstados] = useState(['Demanda Alta','Demanda Media','Demanda Baja'])
  const [matriz, setMatriz] = useState([[200,100,-50],[150,150,0],[100,100,100]])
  const [probs, setProbs] = useState(['0.3','0.5','0.2'])
  const [result, setResult] = useState<DecisionesResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const history = getHistory('decisiones')

  const buildState = (newNa: number, newNe: number, data?: { alternativas?:string[];estados?:string[];matriz?:number[][];probs?:string[] }) => ({
    alternativas: Array.from({length:newNa}, (_,i) => data?.alternativas?.[i] ?? `A${i+1}`),
    estados: Array.from({length:newNe}, (_,j) => data?.estados?.[j] ?? `E${j+1}`),
    matriz: Array.from({length:newNa}, (_,i) => Array.from({length:newNe}, (_,j) => data?.matriz?.[i]?.[j] ?? 0)),
    probs: Array.from({length:newNe}, (_,j) => data?.probs?.[j] ?? ''),
  })

  const generate = (newNa=na, newNe=ne, data?: typeof EXAMPLES[0]['data']) => {
    setNa(newNa); setNe(newNe)
    const s = buildState(newNa, newNe, data)
    setAlternativas(s.alternativas); setEstados(s.estados)
    setMatriz(s.matriz); setProbs(s.probs)
    setResult(null)
  }

  const loadExample = useCallback((data: unknown) => {
    const d = data as typeof EXAMPLES[0]['data']
    setTipo(d.tipo)
    generate(d.na, d.ne, d)
    showToast('Ejemplo cargado','info')
  }, [])

  const sumProbs = probs.map(p=>parseFloat(p)||0).reduce((a,b)=>a+b,0)
  const probsProvided = probs.some(p=>p!=='')
  const probsOk = Math.abs(sumProbs-1)<0.01

  const handleResolve = async () => {
    let probabilidades: number[] | null = null
    if (probsProvided) {
      probabilidades = probs.map(v=>parseFloat(v))
      if (probabilidades.some(isNaN)) return showToast('Probabilidades inválidas','error')
      if (!probsOk) return showToast(`Las probabilidades suman ${sumProbs.toFixed(2)}, deben sumar 1.0`,'error')
    }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await apiPost<DecisionesResult>('/decisiones/resolver', {
        alternativas, estados, matriz, probabilidades, alpha, tipo
      })
      setResult(res)
      saveHistory('decisiones', `Consenso: ${res.consenso}`, {na,ne,tipo,alternativas,estados,matriz,probs})
      showToast(`Decisión recomendada: ${res.consenso}`,'success')
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg); showToast(msg,'error')
    } finally { setLoading(false) }
  }

  const criterios = result
    ? Object.entries(result.resultados).filter(([k, v]) => k !== 'VEIP' && v?.decision)
    : []
  const veip = result?.resultados?.['VEIP'] as (VeipData | undefined)

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <div className="flex flex-col gap-4">
        <SectionCard title="Configuración">
          <div className="flex gap-2.5 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Alternativas</label>
              <input type="number" min={2} max={8} value={na}
                onChange={(e: any) =>setNa(parseInt(e.target.value)||na)} className="io-input w-20" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Estados de naturaleza</label>
              <input type="number" min={2} max={8} value={ne}
                onChange={(e: any) =>setNe(parseInt(e.target.value)||ne)} className="io-input w-20" />
            </div>
            <Select label="Tipo" value={tipo} onChange={(e: any) =>setTipo(e.target.value)} className="flex-1 min-w-[100px]">
              <option value="max">Beneficio (MAX)</option>
              <option value="min">Costo (MIN)</option>
            </Select>
            <Button onClick={()=>generate()}>Generar</Button>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                α de Hurwicz (optimismo)
              </label>
              <span className="text-xs font-bold text-brand-500">{alpha.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={alpha}
              onChange={(e: any) =>setAlpha(parseFloat(e.target.value))}
              className="w-full accent-brand-500" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>Pesimista (0)</span><span>Optimista (1)</span>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <ExamplePills examples={EXAMPLES} onLoad={loadExample} />
            {history.length>0 && <HistoryDropdown history={history} onLoad={loadExample} onClear={()=>clearHistory('decisiones')} />}
          </div>
        </SectionCard>

        <SectionCard title="Matriz de pagos">
          <div className="overflow-x-auto">
            <table className="io-table text-xs">
              <thead>
                <tr>
                  <th className="bg-slate-50 dark:bg-slate-800 text-xs">Alternativa</th>
                  {Array.from({length:ne},(_,j)=>(
                    <th key={j}>
                      <input type="text" value={estados[j]??`E${j+1}`}
                        onChange={(e: any) =>setEstados(es=>es.map((v,jj)=>jj===j?e.target.value:v))}
                        className="w-20 text-center bg-transparent outline-none font-semibold" />
                    </th>
                  ))}
                  <th className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px]">
                    P(estado)
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({length:na},(_,i)=>(
                  <tr key={i}>
                    <td className="bg-slate-50 dark:bg-slate-800">
                      <input type="text" value={alternativas[i]??`A${i+1}`}
                        onChange={(e: any) =>setAlternativas(al=>al.map((v,ii)=>ii===i?e.target.value:v))}
                        className="w-24 bg-transparent outline-none font-medium" />
                    </td>
                    {Array.from({length:ne},(_,j)=>(
                      <td key={j}>
                        <input type="number" value={matriz[i]?.[j]??0}
                          onChange={(e: any) =>setMatriz(m=>m.map((r,ri)=>ri===i?r.map((v,ci)=>ci===j?Number(e.target.value):v):r))}
                          className="w-16 text-center bg-transparent outline-none font-mono" />
                      </td>
                    ))}
                    <td className="bg-blue-50/50 dark:bg-blue-900/10" />
                  </tr>
                ))}
                <tr>
                  <td className="bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-700 dark:text-blue-400 text-[10px]">P(Ej)</td>
                  {Array.from({length:ne},(_,j)=>(
                    <td key={j} className="bg-blue-50/40 dark:bg-blue-900/10">
                      <input type="number" step={0.01} min={0} max={1} value={probs[j]??''} placeholder="0.00"
                        onChange={(e: any) =>setProbs(p=>p.map((v,jj)=>jj===j?e.target.value:v))}
                        className="w-14 text-center bg-transparent outline-none font-mono" />
                    </td>
                  ))}
                  <td className="bg-blue-50 dark:bg-blue-900/20">
                    {probsProvided && (
                      <span className={`text-xs font-bold ${probsOk?'text-green-600 dark:text-green-400':sumProbs>1?'text-red-500':'text-amber-500'}`}>
                        {sumProbs.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Las probabilidades son opcionales (activan EMV y VEIP).</p>
        </SectionCard>

        <PrimaryButton onClick={handleResolve} loading={loading}>
          {loading ? 'Calculando...' : '▶ Calcular todos los criterios'}
        </PrimaryButton>
      </div>

      <div className="flex flex-col gap-4">
        {!result && !loading && !error && (
          <div className="section-card items-center py-12 text-slate-300 dark:text-slate-600 gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <p className="text-sm">Define la matriz de pagos y presiona Calcular</p>
          </div>
        )}
        {loading && <LoadingCard message="Evaluando criterios..." />}
        {error && <ErrorCard message={error} />}
        {result && !loading && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <SectionCard title="Resumen de criterios">
              <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl px-5 py-4 shadow-glow-sm mb-2">
                <p className="text-xs text-brand-200 font-semibold uppercase tracking-wider mb-1">
                  Decisión recomendada (consenso)
                </p>
                <p className="text-2xl font-bold text-white">{result.consenso}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="io-table text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Criterio</th>
                      <th>Decisión</th>
                      <th>Valor</th>
                      <th className="text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criterios.map(([nombre, data]) => (
                      <tr key={nombre} className={data.decision===result.consenso?'optimal':''}>
                        <td className="text-left font-medium">
                          {nombre}
                          {data.alpha !== undefined && (
                            <span className="text-xs text-slate-400 ml-1">(α={data.alpha})</span>
                          )}
                        </td>
                        <td className={`font-bold ${data.decision===result.consenso?'text-brand-500':''}`}>
                          {data.decision}
                        </td>
                        <td className="font-mono">{typeof data.valor==='number'?data.valor.toFixed(2):data.valor}</td>
                        <td className="text-left text-xs text-slate-500 dark:text-slate-400">
                          {alternativas.map((a,i)=>`${a}: ${data.valores[i]?.toFixed(2)??''}`).join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {veip && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
                    VEIP — Valor Esperado de Información Perfecta
                  </p>
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    VEP = {veip.VEP} &nbsp;·&nbsp; VEIP = <strong>{veip.VEIP}</strong>
                  </p>
                </div>
              )}
              <Interpretation text={result.interpretacion} />
            </SectionCard>

            {result.pasos?.length > 0 && (
              <SectionCard title="Procedimiento detallado">
                <StepsPanel pasos={result.pasos} />
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
