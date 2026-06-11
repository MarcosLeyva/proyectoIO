import { useState } from 'react'
import { Activity } from 'lucide-react'
import { apiPost } from '../../lib/api'
import { SectionCard, Interpretation, LoadingCard } from './SharedComponents'
import { Button, showToast } from './FormControls'

interface SensRestr { indice: number; expresion: string; op: string; rhs: number; uso: number; holgura: number; activa: boolean; precio_sombra: number; tipo_recurso: string }
interface SensVar { variable: string; valor: number; coef_objetivo: number; costo_reducido: number; en_base: boolean }
interface SensResult { z: number; restricciones: SensRestr[]; variables: SensVar[]; interpretacion: string; error?: string }

interface Props {
  obj: number[]
  restricciones: { coefs: number[]; op: string; rhs: number }[]
  tipo: string
}

export function SensibilidadPanel({ obj, restricciones, tipo }: Props) {
  const [sens, setSens] = useState<SensResult | null>(null)
  const [loading, setLoading] = useState(false)

  const analizar = async () => {
    if (!restricciones.length) return showToast('Define restricciones válidas', 'error')
    setLoading(true)
    try {
      const res = await apiPost<SensResult>('/sensibilidad/resolver', { obj, restricciones, tipo })
      if (res.error) { showToast(res.error, 'error'); return }
      setSens(res)
      showToast('Análisis de sensibilidad listo', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setLoading(false) }
  }

  return (
    <SectionCard
      title="Análisis de sensibilidad"
      actions={
        <Button variant="secondary" size="sm" onClick={analizar} disabled={loading}>
          <Activity className="w-3.5 h-3.5" /> {loading ? 'Calculando…' : sens ? 'Recalcular' : 'Analizar'}
        </Button>
      }
    >
      {!sens && !loading && (
        <p className="text-sm text-slate-400">
          Calcula precios sombra, holguras y costos reducidos: cuánto vale cada recurso
          y qué tan sensible es la solución óptima.
        </p>
      )}
      {loading && <div className="py-4"><LoadingCard message="Analizando recursos…" /></div>}
      {sens && (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="io-table text-xs">
              <thead><tr><th>Restricción</th><th>Uso / RHS</th><th>Holgura</th><th>Precio sombra</th><th>Recurso</th></tr></thead>
              <tbody>
                {sens.restricciones.map((r) => (
                  <tr key={r.indice}>
                    <td className="font-mono">{r.expresion}</td>
                    <td>{r.uso} / {r.rhs}</td>
                    <td className={r.holgura < 1e-6 ? 'text-red-500 font-semibold' : ''}>{r.holgura}</td>
                    <td className="highlight">{r.precio_sombra}</td>
                    <td className="text-left"><span className={`badge ${r.activa ? 'badge-red' : 'badge-green'}`}>{r.tipo_recurso}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="io-table text-xs">
              <thead><tr><th>Variable</th><th>Valor</th><th>Coef. objetivo</th><th>Costo reducido</th></tr></thead>
              <tbody>
                {sens.variables.map((v) => (
                  <tr key={v.variable}>
                    <td className="font-mono font-semibold">{v.variable}</td>
                    <td className={v.en_base ? 'highlight' : ''}>{v.valor}</td>
                    <td>{v.coef_objetivo}</td>
                    <td>{v.costo_reducido}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Interpretation text={sens.interpretacion} />
        </div>
      )}
    </SectionCard>
  )
}
