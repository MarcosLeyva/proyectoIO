import { useEffect, useState, Suspense, lazy } from 'react'
import { useStore } from './store/useStore'
import { useTheme } from './hooks/useTheme'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Spinner } from './components/shared/SharedComponents'
import { ErrorBoundary } from './components/shared/ErrorBoundary'

// Lazy load modules for better performance
const InicioPage     = lazy(() => import('./modules/inicio/InicioPage').then(m => ({ default: m.InicioPage })))
const GraficoPage    = lazy(() => import('./modules/grafico/GraficoPage').then(m => ({ default: m.GraficoPage })))
const SimplexPage    = lazy(() => import('./modules/simplex/SimplexPage').then(m => ({ default: m.SimplexPage })))
const TransportePage = lazy(() => import('./modules/transporte/TransportePage').then(m => ({ default: m.TransportePage })))
const HungaroPage    = lazy(() => import('./modules/hungaro/HungaroPage').then(m => ({ default: m.HungaroPage })))
const CpmPage        = lazy(() => import('./modules/cpm/CpmPage').then(m => ({ default: m.CpmPage })))
const DijkstraPage   = lazy(() => import('./modules/dijkstra/DijkstraPage').then(m => ({ default: m.DijkstraPage })))

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-24 gap-3">
      <Spinner size="lg" />
      <span className="text-sm text-slate-400">Cargando módulo...</span>
    </div>
  )
}

function ActiveModule() {
  const { activeTab } = useStore()

  const modules = {
    inicio:     <InicioPage />,
    grafico:    <GraficoPage />,
    simplex:    <SimplexPage />,
    transporte: <TransportePage />,
    hungaro:    <HungaroPage />,
    cpm:        <CpmPage />,
    dijkstra:   <DijkstraPage />,
  }

  return (
    <ErrorBoundary key={activeTab}>
      <Suspense fallback={<ModuleLoader />}>
        <div className="animate-fade-in">
          {modules[activeTab]}
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  // Initialize theme on mount
  useTheme()
  const { theme } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-20 lg:hidden" />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-[240px] flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          <ActiveModule />
        </div>
      </main>
    </div>
  )
}
