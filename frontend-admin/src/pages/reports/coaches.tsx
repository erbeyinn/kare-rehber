import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { listCoachStats } from '@/api/reports'
import { EmptyRow, SkeletonRows } from './students'

export default function CoachReportsPage() {
  const q = useQuery({ queryKey: ['report-coaches'], queryFn: listCoachStats })
  const rows = useMemo(() => q.data?.items ?? [], [q.data])

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="Koç Performansı"
        description="Koç başına atanmış öğrenci sayısı, toplam görüşme ve son 30 günkü aktivite."
      />

      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-stone-200/60 bg-white/60 px-5 py-4 backdrop-blur">
        <div className="text-sm text-stone-500">
          {q.isLoading ? '' : `${rows.length} aktif koç`}
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
              <Th>Ad Soyad</Th>
              <Th>Öğrenci</Th>
              <Th>Toplam Görüşme</Th>
              <Th>Son 30 Gün</Th>
              <Th>Son Görüşme</Th>
              <Th>Statü</Th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <SkeletonRows cols={6} />
            ) : rows.length === 0 ? (
              <EmptyRow cols={6}>Henüz onaylı koç yok.</EmptyRow>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60">
                  <td className="px-5 py-3 align-middle font-medium text-stone-900">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-5 py-3 align-middle text-stone-700">{c.student_count}</td>
                  <td className="px-5 py-3 align-middle text-stone-700">{c.meetings_total}</td>
                  <td className="px-5 py-3 align-middle">
                    <span
                      className={
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ' +
                        (c.last_30_days === 0
                          ? 'bg-rose-50 text-rose-700'
                          : c.last_30_days < 3
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700')
                      }
                    >
                      {c.last_30_days}
                    </span>
                  </td>
                  <td className="px-5 py-3 align-middle text-stone-700">
                    {c.last_meeting_at ?? <span className="text-stone-400">—</span>}
                  </td>
                  <td className="px-5 py-3 align-middle">
                    {c.is_active ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">Aktif</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">Pasif</span>
                    )}
                  </td>
                </tr>
              ))
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
