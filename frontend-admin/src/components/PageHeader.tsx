import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 border-b border-stone-200/60 pb-6">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}

export function StatusTabs({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; count?: number }[]
}) {
  return (
    <div className="mb-5 inline-flex gap-1 rounded-full border border-stone-200/70 bg-stone-50/80 p-1 text-sm">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'rounded-full px-4 py-1.5 transition-colors ' +
              (active
                ? 'bg-stone-900 text-stone-50 shadow-sm'
                : 'text-stone-500 hover:text-stone-900')
            }
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={
                  'ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] ' +
                  (active ? 'bg-stone-700 text-stone-100' : 'bg-stone-200 text-stone-600')
                }
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
