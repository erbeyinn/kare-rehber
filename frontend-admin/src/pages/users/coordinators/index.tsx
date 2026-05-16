import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminShell } from '@/components/AdminShell'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import {
  createCoordinator,
  listCoordinators,
  sendCredentials,
  type SimpleUser,
} from '@/api/users'

const schema = z.object({
  first_name: z.string().min(1, 'Ad gerekli'),
  last_name: z.string().min(1, 'Soyad gerekli'),
  phone: z.string().min(7, 'Telefon gerekli'),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-AA-GG'),
})
type FormValues = z.infer<typeof schema>

export default function CoordinatorsPage() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['coordinators'],
    queryFn: () => listCoordinators(),
  })

  const send = useMutation({
    mutationFn: (id: number) => sendCredentials(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coordinators'] }),
  })

  const columns = useMemo<ColumnDef<SimpleUser>[]>(
    () => [
      {
        header: 'Koordinatör',
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
        header: 'Durum',
        id: 'status',
        cell: (info) => (
          <span
            className={
              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ' +
              (info.row.original.is_active
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700')
            }
          >
            {info.row.original.is_active ? 'Aktif' : 'Beklemede'}
          </span>
        ),
      },
      {
        header: '',
        id: 'actions',
        cell: (info) => (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={send.isPending}
              onClick={() => send.mutate(info.row.original.id)}
              className="rounded-full bg-stone-900 px-3 py-1.5 text-xs text-stone-50 hover:bg-stone-800 disabled:opacity-50"
            >
              {send.isPending && send.variables === info.row.original.id
                ? 'Gönderiliyor…'
                : 'Giriş Bilgileri Gönder'}
            </button>
          </div>
        ),
      },
    ],
    [send],
  )

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Kullanıcılar"
        title="Koordinatörler"
        description="Vakıf koordinatörlerini yönetin. Oluşturulduktan sonra giriş bilgileri SMS ile manuel gönderilir."
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800"
          >
            + Yeni Ekle
          </button>
        }
      />
      {isLoading ? (
        <div className="rounded-2xl border border-stone-200/60 bg-white/60 py-10 text-center text-sm text-stone-400">
          Yükleniyor…
        </div>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} empty="Henüz koordinatör yok." />
      )}

      <CoordinatorModal open={open} onClose={() => setOpen(false)} />
    </AdminShell>
  )
}

function CoordinatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createCoordinator(values)
      qc.invalidateQueries({ queryKey: ['coordinators'] })
      reset()
      onClose()
    } catch (err) {
      setError('root', { message: (err as Error).message })
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Yeni Koordinatör" description="Telefon ve doğum tarihi giriş için kullanılacaktır.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Ad" error={errors.first_name?.message}>
          <input className="input" {...register('first_name')} />
        </Field>
        <Field label="Soyad" error={errors.last_name?.message}>
          <input className="input" {...register('last_name')} />
        </Field>
        <Field label="Telefon" error={errors.phone?.message}>
          <input className="input" placeholder="+90555..." {...register('phone')} />
        </Field>
        <Field label="Doğum Tarihi (YYYY-AA-GG)" error={errors.birthdate?.message}>
          <input type="date" className="input" {...register('birthdate')} />
        </Field>
        {errors.root && <div className="text-sm text-red-600">{errors.root.message}</div>}
        <div className="mt-2 flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800 disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-stone-500">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}
