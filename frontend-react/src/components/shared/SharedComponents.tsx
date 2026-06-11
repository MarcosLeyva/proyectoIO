import React, { useState } from 'react'
import { FileDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { exportarPDF } from '../../lib/pdf'

interface PdfButtonProps {
  targetRef: React.RefObject<HTMLElement | null>
  filename: string
  titulo: string
}

export function PdfButton({ targetRef, filename, titulo }: PdfButtonProps) {
  const [busy, setBusy] = useState(false)
  const onClick = async () => {
    if (!targetRef.current) return
    setBusy(true)
    try { await exportarPDF(targetRef.current, filename, titulo) }
    catch (e) { console.error(e) }
    finally { setBusy(false) }
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
    >
      <FileDown className="w-3.5 h-3.5" />
      {busy ? 'Generando…' : 'Exportar PDF'}
    </button>
  )
}

interface SectionCardProps {
  title: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function SectionCard({ title, children, className, actions }: SectionCardProps) {
  return (
    <div className={cn('section-card', className)}>
      <div className="flex items-center justify-between">
        <div className="section-card-header mb-0 pb-0 border-b-0 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="border-b border-slate-100 dark:border-slate-700 -mx-5" />
      <div>{children}</div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={cn('stat-card', accent && 'accent')}>
      <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">{label}</div>
      <div className={cn(
        'text-2xl font-bold leading-tight font-mono tabular-nums',
        accent ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-100'
      )}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

interface InterpretationProps {
  text?: string
}

export function Interpretation({ text }: InterpretationProps) {
  if (!text) return null
  return (
    <div className="bg-brand-50 dark:bg-brand-900/20 border-l-4 border-brand-400 rounded-r-lg px-4 py-3">
      <div className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
        Interpretación
      </div>
      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{text}</div>
    </div>
  )
}

export interface Paso {
  titulo?: string
  detalle?: string
  matriz?: number[][]
  asignacion?: number[][]
}

interface StepsPanelProps {
  pasos: (string | Paso)[]
}

function MiniMatriz({ mat }: { mat: number[][] }) {
  if (!mat?.length) return null
  return (
    <div className="overflow-x-auto mt-2">
      <table className="io-table text-xs">
        <tbody>
          {mat.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j}>{Number.isInteger(v) ? v : Number(v.toFixed(4))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StepsPanel({ pasos }: StepsPanelProps) {
  if (!pasos?.length) return null
  return (
    <div className="flex flex-col gap-2">
      {pasos.map((paso, i) => {
        const isStr = typeof paso === 'string'
        const titulo = isStr ? undefined : paso.titulo
        const detalle = isStr ? paso : paso.detalle
        const matriz = isStr ? undefined : (paso.matriz ?? paso.asignacion)
        return (
          <div key={i} className="border-l-[3px] border-brand-300 dark:border-brand-600 pl-3.5 py-2 bg-brand-50/40 dark:bg-brand-900/10 rounded-r-md">
            <div className="text-xs font-semibold text-brand-500 dark:text-brand-400 mb-0.5">
              Paso {i + 1}{titulo ? ` — ${titulo}` : ''}
            </div>
            {detalle && <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{detalle}</div>}
            {matriz && <MiniMatriz mat={matriz} />}
          </div>
        )
      })}
    </div>
  )
}

interface LiveBadgeProps {
  label?: string
}

export function LiveBadge({ label = 'En vivo' }: LiveBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
      {label}
    </span>
  )
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={cn('border-2 border-brand-200 dark:border-brand-800 border-t-brand-500 rounded-full animate-spin', sizes[size])} />
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400 dark:text-slate-500">
      <div className="opacity-40">{icon}</div>
      <div className="text-center">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

interface LoadingCardProps {
  message?: string
}

export function LoadingCard({ message = 'Calculando...' }: LoadingCardProps) {
  return (
    <div className="section-card items-center justify-center py-12 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  )
}

interface ErrorCardProps {
  message: string
}

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div className="alert-error flex items-start gap-2">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  )
}
