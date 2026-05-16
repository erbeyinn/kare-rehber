import { useEffect, useState, type ReactNode } from 'react'

type ToastVariant = 'info' | 'error' | 'success'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

let nextId = 1
const listeners = new Set<(t: ToastItem) => void>()

export function showToast(message: string, variant: ToastVariant = 'info') {
  const toast: ToastItem = { id: nextId++, message, variant }
  listeners.forEach((l) => l(toast))
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    function onToast(t: ToastItem) {
      setItems((prev) => [...prev, t])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id))
      }, 4500)
    }
    listeners.add(onToast)
    return () => {
      listeners.delete(onToast)
    }
  }, [])

  return (
    <>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={
              'pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur transition ' +
              variantClass(t.variant)
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  )
}

function variantClass(v: ToastVariant): string {
  switch (v) {
    case 'error':
      return 'border-rose-200 bg-rose-50/95 text-rose-800'
    case 'success':
      return 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
    default:
      return 'border-stone-200 bg-white/95 text-stone-800'
  }
}
