import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminShell } from '@/components/AdminShell'
import { DataTable } from '@/components/DataTable'
import { PageHeader, StatusTabs } from '@/components/PageHeader'
import { approveStudent, listStudents, type Student, type StatusFilter } from '@/api/users'

export default function StudentsPage() {
  const [status, setStatus] = useState<StatusFilter>('pending')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['students', status],
    queryFn: () => listStudents(status),
  })

  const approve = useMutation({
    mutationFn: (id: number) => approveStudent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        header: 'Öğrenci',
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
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
        header: 'Okul / Sınıf',
        id: 'school',
        cell: (info) => (
          <div className="text-stone-600">
            <div>{info.row.original.school ?? '—'}</div>
            <div className="text-xs text-stone-400">{info.row.original.grade ?? ''}</div>
          </div>
        ),
      },
      {
        header: 'Şehir',
        accessorKey: 'city',
        cell: (info) => info.row.original.city ?? '—',
      },
      {
        header: 'Veli',
        id: 'parent',
        cell: (info) =>
          info.row.original.parent ? (
            <div className="text-stone-600">
              <div>
                {info.row.original.parent.first_name} {info.row.original.parent.last_name}
              </div>
              <div className="text-xs text-stone-400">{info.row.original.parent.phone}</div>
            </div>
          ) : (
            '—'
          ),
      },
      {
        header: '',
        id: 'actions',
        cell: (info) => {
          const s = info.row.original
          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate(`/users/students/${s.id}`)}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
              >
                Detay
              </button>
              {!s.is_active && (
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(s.id)}
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
        title="Öğrenciler"
        description="Kayıt olmuş öğrencileri yönetin, kesin kaydı onaylayın."
      />
      <StatusTabs
        value={status}
        onChange={(v) => setStatus(v as StatusFilter)}
        options={[
          { value: 'pending', label: 'Bekleyen' },
          { value: 'active', label: 'Aktif' },
        ]}
      />
      {isLoading ? (
        <div className="rounded-2xl border border-stone-200/60 bg-white/60 py-10 text-center text-sm text-stone-400">
          Yükleniyor…
        </div>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} empty="Bu durumda öğrenci yok." />
      )}
    </AdminShell>
  )
}
