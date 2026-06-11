import { useStore, ModuleKey } from '../../store/useStore'

const MODULE_META: Record<ModuleKey, { title: string; sub: string }> = {
  inicio:     { title: 'Inicio',                 sub: 'Suite de Investigación de Operaciones' },
  grafico:    { title: 'Método Gráfico',        sub: 'Programación Lineal — 2 variables' },
  simplex:    { title: 'Simplex (Gran M)',       sub: 'Programación Lineal — n variables' },
  transporte: { title: 'Problema de Transporte', sub: 'Método de Vogel + MODI' },
  hungaro:    { title: 'Problema de Asignación', sub: 'Método Húngaro' },
  cpm:        { title: 'CPM / PERT',             sub: 'Ruta crítica y análisis de proyectos' },
  dijkstra:   { title: 'Ruta más corta',         sub: 'Algoritmo de Dijkstra' },
}

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { activeTab } = useStore()
  const meta = MODULE_META[activeTab]

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-10 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex-shrink-0 w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
            {meta.title}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{meta.sub}</p>
        </div>
      </div>
      <a
        href="http://localhost:8000/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        API Docs
      </a>
    </header>
  )
}
