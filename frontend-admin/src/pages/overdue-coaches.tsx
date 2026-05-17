import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { listOverdueCoaches, type OverdueCoach } from '@/api/reports'
import { sendBulkSMS, sendOverdueCoachesSMS, type BulkSendResult } from '@/api/sms'

export default function OverdueCoachesPage() {
  const qc = useQueryClient()
  const [days, setDays] = useState(14)
  const [draftDays, setDraftDays] = useState(14)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [smsModal, setSmsModal] = useState<'selected' | 'all' | null>(null)
  const [body, setBody] = useState('')
  const [result, setResult] = useState<BulkSendResult | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['overdue-coaches', days],
    queryFn: () => listOverdueCoaches(days),
  })

  const coaches = useMemo(() => data?.items ?? [], [data])

  const sendSelected = useMutation({
    mutationFn: () => sendBulkSMS(Array.from(selected), body),
    onSuccess: (res) => {
      setResult(res)
      qc.invalidateQueries({ queryKey: ['overdue-coaches'] })
      setSelected(new Set())
    },
  })

  const sendAll = useMutation({
    mutationFn: () => sendOverdueCoachesSMS(body, days),
    onSuccess: (res) => {
      setResult(res)
      qc.invalidateQueries({ queryKey: ['overdue-coaches'] })
    },
  })

  const submitting = sendSelected.isPending || sendAll.isPending
  const selectedCount = selected.size
  const totalCount = coaches.length

  const allSelected = useMemo(
    () => totalCount > 0 && coaches.every((c) => selected.has(c.id)),
    [coaches, selected, totalCount],
  )

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(coaches.map((c) => c.id)))
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openModal(mode: 'selected' | 'all') {
    setBody('')
    setResult(null)
    setSmsModal(mode)
  }

  function closeModal() {
    if (submitting) return
    setSmsModal(null)
  }

  function applyDays() {
    if (draftDays < 0 || Number.isNaN(draftDays)) return
    setDays(draftDays)
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="Geciken Koçlar"
        description="Belirlenen aralıkta öğrencisiyle görüşme yapmamış koçlar. SMS ile manuel hatırlatma gönderebilirsiniz."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/60 bg-white/60 px-4 py-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:px-5">
        <div className="flex flex-col">
          <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
            Gün Eşiği
          </label>
          <input
            type="number"
            min={0}
            value={draftDays}
            onChange={(e) => setDraftDays(Number(e.target.value))}
            onBlur={applyDays}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyDays()
            }}
            className="w-28 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400"
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50 sm:self-auto"
        >
          {isFetching ? 'Yenileniyor…' : 'Yenile'}
        </button>
        <div className="text-sm text-stone-500 sm:ml-auto">
          {isLoading ? '' : `${totalCount} koç görüşmesi gecikmiş`}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200/70 bg-stone-50/70 text-left">
              <th className="w-10 px-5 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={totalCount === 0}
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                />
              </th>
              <Th>Ad Soyad</Th>
              <Th>Telefon</Th>
              <Th>Öğrenci</Th>
              <Th>Son Görüşme</Th>
              <Th>Gün</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400">
                  Yükleniyor…
                </td>
              </tr>
            ) : coaches.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-stone-400">
                  Bu eşikte geciken koç yok.
                </td>
              </tr>
            ) : (
              coaches.map((c) => {
                const isSel = selected.has(c.id)
                return (
                  <tr
                    key={c.id}
                    className={
                      'border-b border-stone-100 last:border-0 transition-colors ' +
                      (isSel ? 'bg-stone-50' : 'hover:bg-stone-50/60')
                    }
                  >
                    <td className="px-5 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                      />
                    </td>
                    <td className="px-5 py-3 align-middle font-medium text-stone-900">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-5 py-3 align-middle text-stone-700">{c.phone}</td>
                    <td className="px-5 py-3 align-middle text-stone-700">{c.student_count}</td>
                    <td className="px-5 py-3 align-middle">
                      {c.last_meeting_at ? (
                        <span className="text-stone-700">{c.last_meeting_at}</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                          Hiç görüşme yok
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <span className={overdueBadge(c)}>
                        {c.days_overdue} gün
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="sticky bottom-4 mt-8 flex flex-col items-stretch gap-3 rounded-2xl border border-stone-200/70 bg-white/90 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,.06)] backdrop-blur sm:bottom-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">{selectedCount}</span> koç seçildi
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => openModal('selected')}
            disabled={selectedCount === 0}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Seçilenlere SMS Gönder
          </button>
          <button
            type="button"
            onClick={() => openModal('all')}
            disabled={totalCount === 0}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hepsine SMS Gönder
          </button>
        </div>
      </div>

      <Modal
        open={smsModal !== null}
        onClose={closeModal}
        title={smsModal === 'all' ? 'Tüm Geciken Koçlara SMS' : 'Seçilen Koçlara SMS'}
        description={
          smsModal === 'all'
            ? `${totalCount} koça aynı mesaj gönderilecek.`
            : `${selectedCount} koça aynı mesaj gönderilecek.`
        }
      >
        {result ? (
          <SendSummary
            result={result}
            onClose={() => {
              setResult(null)
              setSmsModal(null)
            }}
          />
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Mesaj metni…"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400"
            />
            <div className="mt-1 text-right text-xs text-stone-400">{body.length} karakter</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={submitting || body.trim().length === 0}
                onClick={() =>
                  smsModal === 'all' ? sendAll.mutate() : sendSelected.mutate()
                }
                className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800 disabled:opacity-50"
              >
                {submitting ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
            {(sendAll.isError || sendSelected.isError) && (
              <div className="mt-3 text-sm text-red-600">
                {((sendAll.error ?? sendSelected.error) as Error)?.message}
              </div>
            )}
          </>
        )}
      </Modal>
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

function SendSummary({
  result,
  onClose,
}: {
  result: BulkSendResult
  onClose: () => void
}) {
  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <span className="font-semibold text-emerald-700">{result.sent}</span> gönderildi
        {result.failed > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-rose-700">{result.failed}</span> başarısız
          </>
        )}
      </div>
      {result.failures && result.failures.length > 0 && (
        <ul className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white text-xs">
          {result.failures.map((f) => (
            <li key={f.user_id} className="border-b border-stone-100 px-3 py-2 last:border-0">
              <span className="font-medium text-stone-700">#{f.user_id}</span>
              {f.phone && <span className="text-stone-400"> · {f.phone}</span>}
              <span className="text-rose-600"> — {f.error}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800"
        >
          Kapat
        </button>
      </div>
    </div>
  )
}

function overdueBadge(c: OverdueCoach): string {
  const base = 'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium '
  if (!c.last_meeting_at) return base + 'bg-rose-50 text-rose-700'
  if (c.days_overdue >= 30) return base + 'bg-rose-50 text-rose-700'
  if (c.days_overdue >= 21) return base + 'bg-amber-50 text-amber-700'
  return base + 'bg-stone-100 text-stone-700'
}
