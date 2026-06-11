import { cn } from '../../lib/utils'
import { useStore, ModuleKey } from '../../store/useStore'
import { useTheme } from '../../hooks/useTheme'

const NAV_SECTIONS = [
  {
    title: 'Programación Lineal',
    items: [
      {
        key: 'grafico' as ModuleKey,
        label: 'Método Gráfico',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        key: 'simplex' as ModuleKey,
        label: 'Simplex (Gran M)',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Distribución',
    items: [
      {
        key: 'transporte' as ModuleKey,
        label: 'Transporte',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        ),
      },
      {
        key: 'hungaro' as ModuleKey,
        label: 'Asignación',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Redes y Proyectos',
    items: [
      {
        key: 'cpm' as ModuleKey,
        label: 'CPM / PERT',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },
      {
        key: 'dijkstra' as ModuleKey,
        label: 'Ruta más corta',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" />
            <path d="M9 19h4a3 3 0 0 0 3-3V8" />
          </svg>
        ),
      },
    ],
  },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { activeTab, setActiveTab } = useStore()
  const { theme, toggleTheme } = useTheme()

  const go = (tab: ModuleKey) => { setActiveTab(tab); onClose?.() }

  return (
    <aside className={cn(
      'w-[240px] min-w-[240px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed top-0 left-0 h-screen overflow-y-auto z-30 transition-transform duration-200',
      'lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full'
    )}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M3 3h18v18H3z" strokeLinejoin="round" /><path d="M3 9h18M9 3v18" />
          </svg>
        </div>
        <div>
          <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">IO Solver</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 leading-tight">Inv. de Operaciones</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {/* Inicio (destacado) */}
        <button
          onClick={() => go('inicio')}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left mb-2',
            activeTab === 'inicio'
              ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <span className={cn('flex-shrink-0', activeTab === 'inicio' ? 'text-brand-500 dark:text-brand-400' : 'opacity-60')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span className="leading-tight">Inicio</span>
          {activeTab === 'inicio' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500" />}
        </button>

        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-1">
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-2.5 py-2.5">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = activeTab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left mb-0.5',
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                >
                  <span className={cn(
                    'transition-colors flex-shrink-0',
                    isActive ? 'text-brand-500 dark:text-brand-400' : 'opacity-60'
                  )}>
                    {item.icon}
                  </span>
                  <span className="leading-tight">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          IO
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">La Salle Oaxaca</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Sebastian Gandarillas</div>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex-shrink-0"
        >
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  )
}
