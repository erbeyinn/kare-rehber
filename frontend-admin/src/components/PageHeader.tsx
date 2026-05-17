import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-stone-200/60 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
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
    <div className="mb-5 -mx-1 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-stone-200/70 bg-stone-50/80 p-1 text-sm whitespace-nowrap">
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
