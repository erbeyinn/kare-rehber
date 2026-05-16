import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { approveStudent, getStudent } from '@/api/users'

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId),
    enabled: Number.isFinite(studentId),
  })

  const approve = useMutation({
    mutationFn: () => approveStudent(studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', studentId] })
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })

  return (
    <AdminShell>
      <PageHeader
        eyebrow={
          <span>
            <Link to="/users/students" className="hover:underline">Öğrenciler</Link> · Detay
          </span>
        }
        title={data ? `${data.first_name} ${data.last_name}` : 'Öğrenci'}
        description={data?.is_active ? 'Aktif kullanıcı.' : 'Bekleyen kayıt — onay sonrası SMS gönderilir.'}
        actions={
          data && !data.is_active ? (
            <button
              type="button"
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800 disabled:opacity-50"
            >
              {approve.isPending ? 'Onaylanıyor…' : 'Onayla & SMS gönder'}
            </button>
          ) : undefined
        }
      />

      {isLoading || !data ? (
        <div className="text-sm text-stone-400">Yükleniyor…</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Section title="Öğrenci">
            <Field label="Ad Soyad" value={`${data.first_name} ${data.last_name}`} />
            <Field label="Telefon" value={data.phone} />
            <Field label="Doğum Tarihi" value={data.birthdate} />
            <Field label="Okul" value={data.school ?? '—'} />
            <Field label="Sınıf" value={data.grade ?? '—'} />
            <Field label="Şehir" value={data.city ?? '—'} />
            <Field label="Durum" value={data.is_active ? 'Aktif' : 'Beklemede'} />
          </Section>
          <Section title="Veli">
            {data.parent ? (
              <>
                <Field label="Ad Soyad" value={`${data.parent.first_name} ${data.parent.last_name}`} />
                <Field label="Telefon" value={data.parent.phone} />
                <Field label="Doğum Tarihi" value={data.parent.birthdate} />
                <Field label="Durum" value={data.parent.is_active ? 'Aktif' : 'Beklemede'} />
              </>
            ) : (
              <div className="text-sm text-stone-500">Veli kaydı bulunamadı.</div>
            )}
          </Section>
        </div>
      )}
    </AdminShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white/80 p-6 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
      <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
      <div className="text-xs uppercase tracking-wider text-stone-400">{label}</div>
      <div className="text-sm text-stone-800">{value}</div>
    </div>
  )
}
