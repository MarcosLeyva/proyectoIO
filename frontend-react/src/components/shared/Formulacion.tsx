import { FunctionSquare } from 'lucide-react'

const sub = (n: number) => String(n).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('')
const fmtCoef = (c: number) => (c === 1 ? '' : c === -1 ? '−' : `${c}`)

interface PLData { obj: number[]; restricciones: { coefs: number[]; op: string; rhs: number }[]; tipo: string; variables?: string[] }
interface TransporteData { m: number; n: number }
interface AsignacionData { n: number; tipo: string }
interface DecisionesData { alternativas: string[]; estados: string[]; tipo: string }

type FormulacionProps =
  | { tipo: 'pl'; data: PLData }
  | { tipo: 'transporte'; data: TransporteData }
  | { tipo: 'asignacion'; data: AsignacionData }
  | { tipo: 'decisiones'; data: DecisionesData }

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/10 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <FunctionSquare className="w-3.5 h-3.5 text-brand-500" />
        <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
          Formulación del modelo
        </span>
      </div>
      <div className="font-mono text-[13px] leading-loose text-slate-800 dark:text-slate-200">
        {children}
      </div>
    </div>
  )
}

const L = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold text-brand-600 dark:text-brand-400">{children}</span>
)

export function Formulacion(props: FormulacionProps) {
  if (props.tipo === 'pl') {
    const { obj, restricciones, tipo, variables } = props.data
    const vars = variables ?? obj.map((_, i) => `x${sub(i + 1)}`)
    const termino = (c: number, i: number) => `${fmtCoef(c)}${vars[i]}`
    const joinTerms = (coefs: number[]) =>
      coefs.map((c, i) => termino(c, i)).join(' + ').replace(/\+ −/g, '− ')
    return (
      <Wrapper>
        <div><L>{tipo === 'max' ? 'Maximizar' : 'Minimizar'}</L> &nbsp;Z = {joinTerms(obj)}</div>
        <div><L>Sujeto a:</L></div>
        {restricciones.map((r, i) => (
          <div key={i} className="pl-6">{joinTerms(r.coefs)} {r.op} {r.rhs}</div>
        ))}
        <div className="pl-6">{vars.map((v) => `${v} ≥ 0`).join(', ')}</div>
      </Wrapper>
    )
  }

  if (props.tipo === 'transporte') {
    const { m, n } = props.data
    return (
      <Wrapper>
        <div><L>Minimizar</L> &nbsp;Z = Σ<sub>i</sub>Σ<sub>j</sub> c<sub>ij</sub>·x<sub>ij</sub></div>
        <div><L>Sujeto a:</L></div>
        <div className="pl-6">Σ<sub>j</sub> x<sub>ij</sub> = s<sub>i</sub> &nbsp;(oferta, i = 1…{m})</div>
        <div className="pl-6">Σ<sub>i</sub> x<sub>ij</sub> = d<sub>j</sub> &nbsp;(demanda, j = 1…{n})</div>
        <div className="pl-6">x<sub>ij</sub> ≥ 0 &nbsp;∀ i, j</div>
      </Wrapper>
    )
  }

  if (props.tipo === 'asignacion') {
    const { n, tipo } = props.data
    return (
      <Wrapper>
        <div><L>{tipo === 'min' ? 'Minimizar' : 'Maximizar'}</L> &nbsp;Z = Σ<sub>i</sub>Σ<sub>j</sub> c<sub>ij</sub>·x<sub>ij</sub></div>
        <div><L>Sujeto a:</L></div>
        <div className="pl-6">Σ<sub>j</sub> x<sub>ij</sub> = 1 &nbsp;(cada agente → 1 tarea)</div>
        <div className="pl-6">Σ<sub>i</sub> x<sub>ij</sub> = 1 &nbsp;(cada tarea → 1 agente)</div>
        <div className="pl-6">x<sub>ij</sub> ∈ {'{0, 1}'} &nbsp;(i, j = 1…{n})</div>
      </Wrapper>
    )
  }

  // decisiones
  const { alternativas, estados, tipo } = props.data
  return (
    <Wrapper>
      <div><L>{tipo === 'max' ? 'Maximizar' : 'Minimizar'}</L> &nbsp;el valor bajo el criterio elegido</div>
      <div><L>Alternativas:</L> {alternativas.join(', ')}</div>
      <div><L>Estados de naturaleza:</L> {estados.join(', ')}</div>
      <div><L>Criterios:</L> Maximax · Maximin · Hurwicz · Laplace · VE</div>
    </Wrapper>
  )
}
