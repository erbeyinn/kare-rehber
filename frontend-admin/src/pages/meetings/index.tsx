import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminShell } from '@/components/AdminShell'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusTabs } from '@/components/PageHeader'
import { approveMeeting, listMeetings, type AdminMeetingFilter, type Meeting } from '@/api/meetings'

const STATUS_LABEL: Record<Meeting['status'], string> = {
  draft: 'Taslak',
  pending: 'Onay Bekliyor',
  approved: 'Onaylı',
}

const STATUS_TONE: Record<Meeting['status'], string> = {
  draft: 'bg-stone-100 text-stone-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
}

export default function MeetingsPage() {
  const [filter, setFilter] = useState<AdminMeetingFilter>('pending')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', filter],
    queryFn: () => listMeetings(filter),
  })

  const approve = useMutation({
    mutationFn: (id: number) => approveMeeting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  })

  const columns = useMemo<ColumnDef<Meeting>[]>(
    () => [
      {
        header: 'Tarih',
        id: 'meeting_date',
        cell: (info) => (
          <div className="font-medium text-stone-900">{formatDate(info.row.original.meeting_date)}</div>
        ),
      },
      {
        header: 'Öğrenci',
        id: 'student',
        cell: (info) => fullName(info.row.original.student),
      },
      {
        header: 'Koç',
        id: 'coach',
        cell: (info) => fullName(info.row.original.coach),
      },
      {
        header: 'İçerik',
        id: 'content',
        cell: (info) => (
          <div className="line-clamp-2 max-w-md text-stone-600">
            {info.row.original.content || <span className="text-stone-400">—</span>}
          </div>
        ),
      },
      {
        header: 'Durum',
        id: 'status',
        cell: (info) => {
          const s = info.row.original.status
          return (
            <span className={'inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ' + STATUS_TONE[s]}>
              {STATUS_LABEL[s]}
            </span>
          )
        },
      },
      {
        header: '',
        id: 'actions',
        cell: (info) => {
          const m = info.row.original
          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate(`/meetings/${m.id}`)}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-100"
              >
                Detay
              </button>
              {m.status === 'pending' && (
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(m.id)}
                  className="rounded-full bg-stone-900 px-3 py-1.5 text-xs text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-50"
                >
                  Onayla
                </button>
              )}
            </div>
          )
        },
      },
    ],
    [approve, navigate],
  )

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Görüşmeler"
        title="Görüşme Onayları"
        description="Koçların gönderdiği görüşmeleri inceleyin, gerekirse düzenleyin ve onaylayın."
      />
      <StatusTabs
        value={filter}
        onChange={(v) => setFilter(v as AdminMeetingFilter)}
        options={[
          { value: 'pending', label: 'Onay Bekleyen' },
          { value: 'all', label: 'Tümü' },
        ]}
      />
      {isLoading ? (
        <div className="rounded-2xl border border-stone-200/60 bg-white/60 py-10 text-center text-sm text-stone-400">
          Yükleniyor…
        </div>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} empty="Bu durumda görüşme yok." />
      )}
    </AdminShell>
  )
}

function fullName(p?: { first_name: string; last_name: string } | null) {
  if (!p) return <span className="text-stone-400">—</span>
  return (
    <span className="text-stone-700">
      {p.first_name} {p.last_name}
    </span>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return iso
}
