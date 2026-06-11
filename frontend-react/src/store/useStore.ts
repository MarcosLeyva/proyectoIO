import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleKey = 'inicio' | 'grafico' | 'simplex' | 'transporte' | 'hungaro' | 'cpm' | 'dijkstra'

interface HistoryItem {
  label: string
  input: unknown
  ts: number
}

interface AppState {
  activeTab: ModuleKey
  theme: 'light' | 'dark'
  history: Record<string, HistoryItem[]>
  setActiveTab: (tab: ModuleKey) => void
  toggleTheme: () => void
  saveHistory: (module: string, label: string, input: unknown) => void
  getHistory: (module: string) => HistoryItem[]
  clearHistory: (module: string) => void
}

const MAX_HISTORY = 5

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'inicio',
      theme: 'dark',
      history: {},

      setActiveTab: (tab) => set({ activeTab: tab }),

      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      saveHistory: (module, label, input) => {
        const list = get().history[module] ?? []
        const updated = [{ label, input, ts: Date.now() }, ...list].slice(0, MAX_HISTORY)
        set((s) => ({ history: { ...s.history, [module]: updated } }))
      },

      getHistory: (module) => get().history[module] ?? [],

      clearHistory: (module) => {
        set((s) => {
          const h = { ...s.history }
          delete h[module]
          return { history: h }
        })
      },
    }),
    { name: 'io-solver-store' }
  )
)
