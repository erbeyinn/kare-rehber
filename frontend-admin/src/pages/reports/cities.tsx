import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { listCityStats } from '@/api/reports'
import { EmptyRow, SkeletonRows } from './students'

export default function CityReportsPage() {
  const q = useQuery({ queryKey: ['report-cities'], queryFn: listCityStats })
  const rows = useMemo(() => q.data?.items ?? [], [q.data])
  const max = useMemo(() => rows.reduce((m, r) => Math.max(m, r.student_count), 0), [rows])
  const total = useMemo(() => rows.reduce((s, r) => s + r.student_count, 0), [rows])

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="İl Dağılımı"
        description="İl bazında öğrenci ve atanmış koç sayıları."
      />

      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-stone-200/60 bg-white/60 px-5 py-4 backdrop-blur">
        <div className="text-sm text-stone-500">
          {q.isLoading ? '' : `${rows.length} il · ${total} öğrenci`}
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
        >
          {q.isFetching ? 'Yenileniyor…' : 'Yenile'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200/70 bg-stone-50/70 text-left">
              <Th>İl</Th>
              <Th>Öğrenci</Th>
              <Th>Koç</Th>
              <Th>Dağılım</Th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <SkeletonRows cols={4} />
            ) : rows.length === 0 ? (
              <EmptyRow cols={4}>Şehir bilgisi olan öğrenci yok.</EmptyRow>
            ) : (
              rows.map((c) => {
                const pct = max > 0 ? (c.student_count / max) * 100 : 0
                return (
                  <tr key={c.city} className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3 align-middle font-medium text-stone-900">{c.city}</td>
                    <td className="px-5 py-3 align-middle text-stone-700">{c.student_count}</td>
                    <td className="px-5 py-3 align-middle text-stone-700">{c.coach_count}</td>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
      {children}
    </th>
  )
}
