import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import {
  approveMeeting,
  getMeeting,
  updateMeeting,
  type MeetingStatus,
} from '@/api/meetings'

const schema = z.object({
  meeting_date: z.string().min(1, 'Tarih gerekli'),
  content: z.string(),
  evaluation: z.string(),
  status: z.enum(['draft', 'pending', 'approved']),
})

type FormValues = z.infer<typeof schema>

const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: 'Taslak',
  pending: 'Onay Bekliyor',
  approved: 'Onaylı',
}

const STATUS_TONE: Record<MeetingStatus, string> = {
  draft: 'bg-stone-100 text-stone-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const meetingId = Number(id)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => getMeeting(meetingId),
    enabled: Number.isFinite(meetingId),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!data) return
    reset({
      meeting_date: data.meeting_date,
      content: data.content,
      evaluation: data.evaluation,
      status: data.status,
    })
  }, [data, reset])

  const approve = useMutation({
    mutationFn: () => approveMeeting(meetingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', meetingId] })
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMeeting(meetingId, values)
      qc.invalidateQueries({ queryKey: ['meeting', meetingId] })
      qc.invalidateQueries({ queryKey: ['meetings'] })
    } catch (err) {
      setError('root', { message: (err as Error).message })
    }
  })

  return (
    <AdminShell>
      <PageHeader
        eyebrow={
          <span>
            <Link to="/meetings" className="hover:underline">Görüşmeler</Link> · Detay
          </span>
        }
        title={data ? `${data.student?.first_name ?? '?'} ${data.student?.last_name ?? ''}` : 'Görüşme'}
        description={
          data ? (
            <span className="inline-flex items-center gap-2">
              <span className={'inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ' + STATUS_TONE[data.status]}>
                {STATUS_LABEL[data.status]}
              </span>
              <span>· Koç: {data.coach ? `${data.coach.first_name} ${data.coach.last_name}` : '—'}</span>
            </span>
          ) : undefined
        }
        actions={
          data && data.status === 'pending' ? (
            <button
              type="button"
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-50"
            >
              {approve.isPending ? 'Onaylanıyor…' : 'Onayla'}
            </button>
          ) : undefined
        }
      />

      {isLoading || !data ? (
        <div className="text-sm text-stone-400">Yükleniyor…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="rounded-2xl border border-stone-200/60 bg-white/80 p-6 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">Görüşme</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Tarih" error={errors.meeting_date?.message}>
                <input type="date" className="input" {...register('meeting_date')} />
              </FormField>
              <FormField label="Durum" error={errors.status?.message}>
                <select className="input" {...register('status')}>
                  <option value="draft">Taslak</option>
                  <option value="pending">Onay Bekliyor</option>
                  <option value="approved">Onaylı</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/60 bg-white/80 p-6 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">İçerik</div>
            <FormField label="Görüşme notu" error={errors.content?.message}>
              <textarea rows={6} className="input min-h-[10rem] resize-y" {...register('content')} />
            </FormField>
            <div className="mt-4">
              <FormField label="Değerlendirme" error={errors.evaluation?.message}>
                <textarea rows={4} className="input min-h-[8rem] resize-y" {...register('evaluation')} />
              </FormField>
            </div>
          </div>

          {errors.root && <div className="text-sm text-red-600">{errors.root.message}</div>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() =>
                reset({
                  meeting_date: data.meeting_date,
                  content: data.content,
                  evaluation: data.evaluation,
                  status: data.status,
                })
              }
              className="rounded-full border border-stone-200 px-5 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100"
            >
              Sıfırla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  )
}

function FormField({
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
