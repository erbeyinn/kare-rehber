import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { listStudentStats } from '@/api/reports'
import { listMatchingCities, listMatchingCoaches } from '@/api/matching'

export default function StudentReportsPage() {
  const [city, setCity] = useState('')
  const [coachId, setCoachId] = useState<number | ''>('')

  const citiesQ = useQuery({ queryKey: ['matching-cities'], queryFn: listMatchingCities })
  const coachesQ = useQuery({ queryKey: ['matching-coaches'], queryFn: listMatchingCoaches })

  const statsQ = useQuery({
    queryKey: ['report-students', city, coachId],
    queryFn: () =>
      listStudentStats({
        city: city || undefined,
        coachId: coachId === '' ? undefined : coachId,
      }),
  })

  const rows = useMemo(() => statsQ.data?.items ?? [], [statsQ.data])

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="Öğrenci Raporu"
        description="Öğrenci başına görüşme sayısı, son görüşme tarihi ve atanmış koç."
      />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200/60 bg-white/60 px-4 py-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:px-5">
        <FilterField label="İl">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-44"
          >
            <option value="">Tüm iller</option>
            {citiesQ.data?.items.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Koç">
          <select
            value={coachId}
            onChange={(e) => setCoachId(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-60"
          >
            <option value="">Tüm koçlar</option>
            {coachesQ.data?.items.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </FilterField>
        <button
          type="button"
          onClick={() => {
            setCity('')
            setCoachId('')
          }}
          className="self-start rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100 sm:self-auto"
        >
          Sıfırla
        </button>
        <div className="text-sm text-stone-500 sm:ml-auto">
          {statsQ.isLoading ? '' : `${rows.length} öğrenci`}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200/70 bg-stone-50/70 text-left">
              <Th>Ad Soyad</Th>
              <Th>İl</Th>
              <Th>Koç</Th>
              <Th>Görüşme</Th>
              <Th>Son Görüşme</Th>
              <Th>Statü</Th>
            </tr>
          </thead>
          <tbody>
            {statsQ.isLoading ? (
              <SkeletonRows cols={6} />
            ) : rows.length === 0 ? (
              <EmptyRow cols={6}>Bu filtrelere uyan öğrenci yok.</EmptyRow>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60">
                  <td className="px-5 py-3 align-middle font-medium text-stone-900">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-5 py-3 align-middle text-stone-700">{s.city ?? '—'}</td>
                  <td className="px-5 py-3 align-middle text-stone-700">
                    {s.coach_name ?? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                        Atanmamış
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 align-middle text-stone-700">{s.meeting_count}</td>
                  <td className="px-5 py-3 align-middle text-stone-700">
                    {s.last_meeting_at ?? (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 align-middle">
                    {s.is_active ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                        Pasif
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </AdminShell>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
        {label}
      </label>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
      {children}
    </th>
  )
}

export function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-stone-100 last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-5 py-3">
              <div className="h-3.5 w-3/5 animate-pulse rounded bg-stone-200/80" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-5 py-12 text-center text-sm text-stone-400">
        {children}
      </td>
    </tr>
  )
}
