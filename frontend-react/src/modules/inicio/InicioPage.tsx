import { useEffect, useState } from 'react'
import {
  LineChart, Grid3x3, Truck, Users, GitBranch, Route,
  ArrowRight, Clock, Sparkles, CheckCircle2,
} from 'lucide-react'
import { useStore, ModuleKey } from '../../store/useStore'
import { timeAgo } from '../../lib/utils'
import { DotGrid } from '../../components/shared/DotGrid'

interface TecnicaCard {
  key: ModuleKey
  titulo: string
  descripcion: string
  categoria: string
  icon: React.ReactNode
  gradient: string
}

const TECNICAS: TecnicaCard[] = [
  {
    key: 'grafico', titulo: 'Método Gráfico', categoria: 'Programación Lineal',
    descripcion: 'Resuelve PL de 2 variables visualizando la región factible y la recta de utilidad.',
    icon: <LineChart className="w-5 h-5" />, gradient: 'from-indigo-500 to-violet-600',
  },
  {
    key: 'simplex', titulo: 'Simplex (Gran M)', categoria: 'Programación Lineal',
    descripcion: 'Optimiza n variables iterando el tableau, con soporte para ≤, ≥ y =.',
    icon: <Grid3x3 className="w-5 h-5" />, gradient: 'from-blue-500 to-cyan-600',
  },
  {
    key: 'transporte', titulo: 'Transporte', categoria: 'Distribución',
    descripcion: 'Minimiza costos de distribución con Vogel y optimización MODI.',
    icon: <Truck className="w-5 h-5" />, gradient: 'from-cyan-500 to-teal-600',
  },
  {
    key: 'hungaro', titulo: 'Asignación', categoria: 'Distribución',
    descripcion: 'Asigna agentes a tareas con el Método Húngaro, costo o beneficio.',
    icon: <Users className="w-5 h-5" />, gradient: 'from-emerald-500 to-green-600',
  },
  {
    key: 'cpm', titulo: 'CPM / PERT', categoria: 'Redes y Proyectos',
    descripcion: 'Ruta crítica, diagrama de Gantt y análisis probabilístico de proyectos.',
    icon: <GitBranch className="w-5 h-5" />, gradient: 'from-amber-500 to-orange-600',
  },
  {
    key: 'dijkstra', titulo: 'Ruta más corta', categoria: 'Redes y Proyectos',
    descripcion: 'Encuentra el camino de costo mínimo entre dos nodos con Dijkstra.',
    icon: <Route className="w-5 h-5" />, gradient: 'from-fuchsia-500 to-purple-600',
  },
]

const N_TECNICAS = TECNICAS.length

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{n}</>
}

function spotlight(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function InicioPage() {
  const { setActiveTab, history } = useStore()

  const totalResueltos = Object.values(history).reduce((sum, list) => sum + list.length, 0)
  const validKeys = new Set(TECNICAS.map((t) => t.key))
  const tecnicasUsadas = Object.keys(history).filter((k) => validKeys.has(k as ModuleKey) && (history[k]?.length ?? 0) > 0).length

  // Actividad reciente combinada (todos los módulos), ordenada por timestamp
  const reciente = Object.entries(history)
    .flatMap(([mod, list]) => list.map((h) => ({ mod, ...h })))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5)

  const nombreModulo = (k: string) => TECNICAS.find((t) => t.key === k)?.titulo ?? k

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      {/* Hero — siempre oscuro, con aurora y rejilla de puntos interactiva */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-8 py-12 text-white shadow-glow ring-1 ring-white/10">
        {/* Aurora de fondo */}
        <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-indigo-600/35 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-32 left-1/3 w-[28rem] h-[28rem] rounded-full bg-violet-700/25 blur-3xl animate-float-slower" />
        <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl animate-float-slow" />

        {/* Puntos interactivos (brillan al acercar el cursor) */}
        <DotGrid className="absolute inset-0 pointer-events-none" />

        <div className="relative pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            Suite de Investigación de Operaciones
          </div>
          <h1 className="font-display text-4xl sm:text-[2.75rem] font-bold leading-[1.08] tracking-tight mb-3">
            Resuelve, visualiza e interpreta
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              problemas de optimización
            </span>
          </h1>
          <p className="text-white/70 text-[15px] max-w-xl mb-7 leading-relaxed">
            {N_TECNICAS} técnicas con resultados verificables, procedimiento paso a paso e
            interpretación automática. Elige una para comenzar.
          </p>
          <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
            <button
              onClick={() => setActiveTab('grafico')}
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:shadow-[0_0_28px_rgba(165,180,252,0.45)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Comenzar con Método Gráfico
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#tecnicas"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Explorar técnicas
            </a>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard icon={<CheckCircle2 className="w-5 h-5" />} label="Problemas resueltos" accent
          value={<CountUp value={totalResueltos} />} />
        <MetricCard icon={<Grid3x3 className="w-5 h-5" />} label="Técnicas utilizadas"
          value={<><CountUp value={tecnicasUsadas} />/{N_TECNICAS}</>} />
        <MetricCard icon={<Sparkles className="w-5 h-5" />} label="Técnicas disponibles"
          value={<CountUp value={N_TECNICAS} />} />
      </div>

      {/* Técnicas */}
      <div id="tecnicas">
        <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
          Técnicas disponibles
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {TECNICAS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              onMouseMove={spotlight}
              className="group relative overflow-hidden text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600"
            >
              {/* Spotlight que sigue al cursor */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(99,102,241,0.13), transparent 65%)' }}
              />
              <div className={`relative w-11 h-11 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white shadow-sm mb-3 transition-transform group-hover:scale-110`}>
                {t.icon}
              </div>
              <div className="relative text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {t.categoria}
              </div>
              <div className="relative font-display text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                {t.titulo}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-brand-500" />
              </div>
              <p className="relative text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.descripcion}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      {reciente.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Actividad reciente
          </h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 divide-y divide-slate-100 dark:divide-slate-700">
            {reciente.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(item.mod as ModuleKey)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center text-brand-500 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.label}</div>
                  <div className="text-xs text-slate-400">{nombreModulo(item.mod)}</div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.ts)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, value, label, accent }: { icon: React.ReactNode; value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${
      accent
        ? 'border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80'
    }`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
        accent ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
      }`}>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold font-mono tabular-nums leading-none ${
          accent ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-100'
        }`}>
          {value}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  )
}
