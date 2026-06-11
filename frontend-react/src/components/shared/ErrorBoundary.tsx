import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('ErrorBoundary capturó un error:', error, info)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Algo salió mal en este módulo</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">{this.state.message}</p>
          </div>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
