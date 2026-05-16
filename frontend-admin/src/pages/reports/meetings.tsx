import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { getMeetingStats } from '@/api/reports'

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Onay bekliyor',
  approved: 'Onaylı',
}

export default function MeetingReportsPage() {
  const init = defaultRange()
  const [from, setFrom] = useState(init.from)
  const [to, setTo] = useState(init.to)

  const q = useQuery({
    queryKey: ['report-meetings', from, to],
    queryFn: () => getMeetingStats(from, to),
  })

  const data = q.data
  const max = useMemo(() => (data ? data.daily.reduce((m, p) => Math.max(m, p.count), 0) : 0), [data])

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="Görüşme Trendi"
        description="Seçilen aralıkta günlük görüşme adetleri ve statü dağılımı."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-stone-200/60 bg-white/60 px-5 py-4 backdrop-blur">
        <FilterField label="Başlangıç">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400"
          />
        </FilterField>
        <FilterField label="Bitiş">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400"
          />
        </FilterField>
        <Quick label="Son 7 gün" days={6} setFrom={setFrom} setTo={setTo} />
        <Quick label="Son 30 gün" days={29} setFrom={setFrom} setTo={setTo} />
        <Quick label="Son 90 gün" days={89} setFrom={setFrom} setTo={setTo} />
        <div className="ml-auto text-sm text-stone-500">
          {q.isLoading ? '' : `Toplam ${data?.total ?? 0} görüşme`}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['draft', 'pending', 'approved'] as const).map((s) => (
          <div key={s} className="rounded-2xl border border-stone-200/60 bg-white/70 px-5 py-4 backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">
              {STATUS_LABELS[s]}
            </div>
            <div className="mt-1 text-2xl font-semibold text-stone-900">
              {q.isLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-stone-200/80" /> : data?.status_counts[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200/70 bg-stone-50/70 text-left">
              <Th>Gün</Th>
              <Th>Sayı</Th>
              <Th>Dağılım</Th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  {[0, 1, 2].map((j) => (
                    <td key={j} className="px-5 py-3">
                      <div className="h-3.5 w-3/5 animate-pulse rounded bg-stone-200/80" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.daily.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-sm text-stone-400">
                  Bu aralıkta görüşme yok.
                </td>
              </tr>
            ) : (
              data.daily.map((p) => {
                const pct = max > 0 ? (p.count / max) * 100 : 0
                return (
                  <tr key={p.day} className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3 align-middle font-medium text-stone-900">{p.day}</td>
                    <td className="px-5 py-3 align-middle text-stone-700">{p.count}</td>
                    <td className="px-5 py-3 align-middle">
                      <div className="flex h-2 w-48 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-stone-900 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">{label}</label>
      {children}
    </div>
  )
}

function Quick({
  label,
  days,
  setFrom,
  setTo,
}: {
  label: string
  days: number
  setFrom: (v: string) => void
  setTo: (v: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - days)
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        setFrom(fmt(from))
        setTo(fmt(to))
      }}
      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
    >
      {label}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
      {children}
    </th>
  )
}
