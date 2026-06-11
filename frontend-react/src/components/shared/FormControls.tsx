import React, { useRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow-glow-sm active:bg-brand-700',
    secondary: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300',
    ghost: 'bg-transparent text-slate-400 hover:text-red-500 dark:hover:text-red-400',
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-700',
    outline: 'bg-transparent text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20',
  }
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2 font-semibold',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 cursor-pointer',
        'active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus:outline-none focus:ring-2 focus:ring-brand-400/30',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  fullWidth?: boolean
}

export function PrimaryButton({ fullWidth, className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      variant="primary"
      size="lg"
      className={cn('w-full', fullWidth && 'w-full', className)}
      {...props}
    />
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  label?: string
  hint?: string
}

export function Input({ error, label, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <input
        className={cn('io-input', error && 'error', className)}
        {...props}
      />
      {hint && <span className={cn('text-xs', error ? 'text-red-500' : 'text-slate-400')}>{hint}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <select
        className={cn(
          'io-input appearance-none cursor-pointer pr-8',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_10px_center]',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

interface ExamplePillsProps {
  examples: Array<{ label: string; data: unknown }>
  onLoad: (data: unknown) => void
}

export function ExamplePills({ examples, onLoad }: ExamplePillsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      <span className="text-xs text-slate-400 dark:text-slate-500 self-center">Ejemplos:</span>
      {examples.map((ex) => (
        <button
          key={ex.label}
          onClick={() => onLoad(ex.data)}
          className="text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors font-medium cursor-pointer border border-brand-100 dark:border-brand-800"
        >
          {ex.label}
        </button>
      ))}
    </div>
  )
}

interface HistoryDropdownProps {
  history: Array<{ label: string; input: unknown; ts: number }>
  onLoad: (input: unknown) => void
  onClear?: () => void
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function HistoryDropdown({ history, onLoad, onClear }: HistoryDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const ref = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!history.length) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        Recientes
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[240px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historial</span>
            {onClear && (
              <button onClick={onClear} className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                Limpiar
              </button>
            )}
          </div>
          {history.map((item, i) => (
            <button
              key={i}
              onClick={() => { onLoad(item.input); setOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{item.label}</span>
              <span className="text-xs text-slate-400">{timeAgo(item.ts)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info' | 'warn'
}

// Global toast function - simple implementation
let toastContainer: HTMLDivElement | null = null

function getToastContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

export function showToast(message: string, type: ToastProps['type'] = 'info') {
  const container = getToastContainer()
  const el = document.createElement('div')
  const colors = {
    success: 'background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d',
    error:   'background:#fef2f2;border:1px solid #fecaca;color:#dc2626',
    info:    'background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb',
    warn:    'background:#fffbeb;border:1px solid #fde68a;color:#d97706',
  }
  el.style.cssText = `${colors[type]};padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.1);animation:slideUpToast .25s ease both;max-width:320px;`
  el.textContent = message
  container.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(6px)'
    el.style.transition = 'opacity .2s,transform .2s'
    setTimeout(() => el.remove(), 200)
  }, 2800)
}
