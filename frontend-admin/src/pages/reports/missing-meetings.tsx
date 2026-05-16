import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { listMissingMeetings, type MissingMeeting } from '@/api/reports'
import { EmptyRow, SkeletonRows } from './students'

export default function MissingMeetingsPage() {
  const [days, setDays] = useState(14)
  const [draft, setDraft] = useState(14)

  const q = useQuery({
    queryKey: ['report-missing-meetings', days],
    queryFn: () => listMissingMeetings(days),
  })

  const rows = useMemo(() => q.data?.items ?? [], [q.data])

  function apply() {
    if (draft < 0 || Number.isNaN(draft)) return
    setDays(draft)
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="Eksik Görüşmeler"
        description="Belirlenen eşikten daha uzun süredir koçuyla görüşmemiş aktif öğrenciler."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-stone-200/60 bg-white/60 px-5 py-4 backdrop-blur">
        <div className="flex flex-col">
          <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">Gün Eşiği</label>
          <input
            type="number"
            min={0}
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
            onBlur={apply}
            onKeyDown={(e) => { if (e.key === 'Enter') apply() }}
            className="w-28 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400"
          />
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
        >
          {q.isFetching ? 'Yenileniyor…' : 'Yenile'}
        </button>
        <div className="ml-auto text-sm text-stone-500">
          {q.isLoading ? '' : `${rows.length} öğrenci`}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200/70 bg-stone-50/70 text-left">
              <Th>Öğrenci</Th>
              <Th>İl</Th>
              <Th>Koç</Th>
              <Th>Son Görüşme</Th>
              <Th>Gün</Th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <SkeletonRows cols={5} />
            ) : rows.length === 0 ? (
              <EmptyRow cols={5}>Bu eşikte eksik görüşmesi olan öğrenci yok.</EmptyRow>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60">
                  <td className="px-5 py-3 align-middle font-medium text-stone-900">{s.first_name} {s.last_name}</td>
                  <td className="px-5 py-3 align-middle text-stone-700">{s.city ?? '—'}</td>
                  <td className="px-5 py-3 align-middle text-stone-700">{s.coach_name ?? '—'}</td>
                  <td className="px-5 py-3 align-middle">
                    {s.last_meeting_at ? (
                      <span className="text-stone-700">{s.last_meeting_at}</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                        Hiç görüşme yok
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 align-middle">
                    <span className={badge(s)}>{s.days_overdue} gün</span>
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

function badge(s: MissingMeeting): string {
  const base = 'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium '
  if (!s.last_meeting_at) return base + 'bg-rose-50 text-rose-700'
  if (s.days_overdue >= 30) return base + 'bg-rose-50 text-rose-700'
  if (s.days_overdue >= 21) return base + 'bg-amber-50 text-amber-700'
  return base + 'bg-stone-100 text-stone-700'
}
