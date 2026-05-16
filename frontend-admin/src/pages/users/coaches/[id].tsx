import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { approveCoach, getCoach } from '@/api/users'

export default function CoachDetailPage() {
  const { id } = useParams<{ id: string }>()
  const coachId = Number(id)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['coach', coachId],
    queryFn: () => getCoach(coachId),
    enabled: Number.isFinite(coachId),
  })

  const approve = useMutation({
    mutationFn: () => approveCoach(coachId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach', coachId] })
      qc.invalidateQueries({ queryKey: ['coaches'] })
    },
  })

  return (
    <AdminShell>
      <PageHeader
        eyebrow={
          <span>
            <Link to="/users/coaches" className="hover:underline">Koçlar</Link> · Detay
          </span>
        }
        title={data ? `${data.first_name} ${data.last_name}` : 'Koç'}
        description={
          data?.is_approved ? 'Onaylı koç — havuzda.' : 'Bekleyen başvuru — onay sonrası SMS gönderilir.'
        }
        actions={
          data && !data.is_approved ? (
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
        <div className="rounded-2xl border border-stone-200/60 bg-white/80 p-6 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
          <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            Profil
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Ad Soyad" value={`${data.first_name} ${data.last_name}`} />
            <Field label="Telefon" value={data.phone} />
            <Field label="Doğum Tarihi" value={data.birthdate} />
            <Field label="Email" value={data.email ?? '—'} />
            <Field label="Uzmanlık" value={data.specialty ?? '—'} />
            <Field label="Durum" value={data.is_approved ? 'Havuzda' : 'Beklemede'} />
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-2 last:border-0 last:pb-0 md:border-0 md:pb-0">
      <div className="text-xs uppercase tracking-wider text-stone-400">{label}</div>
      <div className="text-sm text-stone-800">{value}</div>
    </div>
  )
}
