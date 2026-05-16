import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminShell } from '@/components/AdminShell'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusTabs } from '@/components/PageHeader'
import { approveCoach, listCoaches, type Coach, type StatusFilter } from '@/api/users'

export default function CoachesPage() {
  const [status, setStatus] = useState<StatusFilter>('pending')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['coaches', status],
    queryFn: () => listCoaches(status),
  })

  const approve = useMutation({
    mutationFn: (id: number) => approveCoach(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coaches'] }),
  })

  const columns = useMemo<ColumnDef<Coach>[]>(
    () => [
      {
        header: 'Koç',
        id: 'name',
        cell: (info) => (
          <div className="font-medium text-stone-900">
            {info.row.original.first_name} {info.row.original.last_name}
          </div>
        ),
      },
      {
        header: 'İletişim',
        id: 'contact',
        cell: (info) => (
          <div className="text-stone-600">
            <div>{info.row.original.phone}</div>
            <div className="text-xs text-stone-400">{info.row.original.birthdate}</div>
          </div>
        ),
      },
      {
        header: 'Uzmanlık',
        accessorKey: 'specialty',
        cell: (info) => info.row.original.specialty ?? '—',
      },
      {
        header: '',
        id: 'actions',
        cell: (info) => {
          const c = info.row.original
          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate(`/users/coaches/${c.id}`)}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
              >
                Detay
              </button>
              {!c.is_approved && (
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(c.id)}
                  className="rounded-full bg-stone-900 px-3 py-1.5 text-xs text-stone-50 hover:bg-stone-800 disabled:opacity-50"
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
        eyebrow="Kullanıcılar"
        title="Koçlar"
        description="Koç başvurularını onaylayın ve havuzu yönetin."
      />
      <StatusTabs
        value={status}
        onChange={(v) => setStatus(v as StatusFilter)}
        options={[
          { value: 'pending', label: 'Bekleyen' },
          { value: 'active', label: 'Havuzda' },
        ]}
      />
      {isLoading ? (
        <div className="rounded-2xl border border-stone-200/60 bg-white/60 py-10 text-center text-sm text-stone-400">
          Yükleniyor…
        </div>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} empty="Bu durumda koç yok." />
      )}
    </AdminShell>
  )
}
