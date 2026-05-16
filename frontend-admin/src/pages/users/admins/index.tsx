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
import { createAdmin, listAdmins, type SimpleUser } from '@/api/users'

const schema = z.object({
  first_name: z.string().min(1, 'Ad gerekli'),
  last_name: z.string().min(1, 'Soyad gerekli'),
  phone: z.string().min(7, 'Telefon gerekli'),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-AA-GG'),
  email: z.string().email('Geçersiz email'),
  password: z.string().min(8, 'En az 8 karakter'),
})
type FormValues = z.infer<typeof schema>

export default function AdminsPage() {
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => listAdmins(),
  })

  const columns = useMemo<ColumnDef<SimpleUser>[]>(
    () => [
      {
        header: 'Yönetici',
        id: 'name',
        cell: (info) => (
          <div className="font-medium text-stone-900">
            {info.row.original.first_name} {info.row.original.last_name}
          </div>
        ),
      },
      { header: 'Email', accessorKey: 'email', cell: (info) => info.row.original.email ?? '—' },
      {
        header: 'Telefon',
        id: 'phone',
        cell: (info) => (
          <div className="text-stone-600">
            <div>{info.row.original.phone}</div>
            <div className="text-xs text-stone-400">{info.row.original.birthdate}</div>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Kullanıcılar"
        title="Yöneticiler"
        description="Sistem yöneticilerini ekleyin. Yöneticiler için otomatik SMS gönderilmez."
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
        <DataTable columns={columns} data={data?.items ?? []} empty="Henüz yönetici yok." />
      )}
      <AdminModal open={open} onClose={() => setOpen(false)} />
    </AdminShell>
  )
}

function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => createAdmin(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] })
      reset()
      onClose()
    },
    onError: (err) => setError('root', { message: (err as Error).message }),
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  return (
    <Modal open={open} onClose={onClose} title="Yeni Yönetici" description="Email + şifre ile giriş yapacaktır.">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormRow label="Ad" error={errors.first_name?.message}>
          <input className="input" {...register('first_name')} />
        </FormRow>
        <FormRow label="Soyad" error={errors.last_name?.message}>
          <input className="input" {...register('last_name')} />
        </FormRow>
        <FormRow label="Email" error={errors.email?.message}>
          <input type="email" className="input" {...register('email')} />
        </FormRow>
        <FormRow label="Şifre" error={errors.password?.message}>
          <input type="password" className="input" {...register('password')} />
        </FormRow>
        <FormRow label="Telefon" error={errors.phone?.message}>
          <input className="input" {...register('phone')} />
        </FormRow>
        <FormRow label="Doğum Tarihi" error={errors.birthdate?.message}>
          <input type="date" className="input" {...register('birthdate')} />
        </FormRow>
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
            disabled={isSubmitting || mutation.isPending}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800 disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FormRow({
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
