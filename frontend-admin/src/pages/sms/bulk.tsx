import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { listMatchingCities } from '@/api/matching'
import {
  listRecipients,
  sendBulkSMS,
  type BulkSendResult,
  type SMSRole,
} from '@/api/sms'

const ROLE_OPTIONS: { value: SMSRole; label: string }[] = [
  { value: 'coach', label: 'Koçlar' },
  { value: 'student', label: 'Öğrenciler' },
  { value: 'parent', label: 'Veliler' },
  { value: 'coordinator', label: 'Koordinatörler' },
]

export default function BulkSMSPage() {
  const [role, setRole] = useState<SMSRole>('coach')
  const [city, setCity] = useState<string>('')
  const [body, setBody] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<BulkSendResult | null>(null)

  const cityEnabled = role === 'student' || role === 'parent'
  const citiesQ = useQuery({ queryKey: ['matching-cities'], queryFn: listMatchingCities })

  const recipientsQ = useQuery({
    queryKey: ['sms-recipients', role, cityEnabled ? city : ''],
    queryFn: () => listRecipients(role, cityEnabled ? city || undefined : undefined),
  })

  const items = useMemo(() => recipientsQ.data?.items ?? [], [recipientsQ.data])
  const count = recipientsQ.data?.count ?? 0

  const ids = useMemo(() => items.map((i) => i.id), [items])

  const send = useMutation({
    mutationFn: () => sendBulkSMS(ids, body),
    onSuccess: (res) => {
      setResult(res)
    },
  })

  const canSend = ids.length > 0 && body.trim().length > 0

  return (
    <AdminShell>
      <PageHeader
        eyebrow="SMS"
        title="Toplu SMS"
        description="Rol ve il filtreleriyle bir kitle seçin, mesajınızı yazın ve hepsine gönderin."
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200/60 bg-white/60 px-4 py-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end sm:px-5">
        <div className="flex flex-col">
          <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
            Rol
          </label>
          <select
            value={role}
            onChange={(e) => {
              const next = e.target.value as SMSRole
              setRole(next)
              if (next !== 'student' && next !== 'parent') setCity('')
            }}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-auto sm:min-w-[12rem]"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
            İl {cityEnabled ? '' : '(rol için geçerli değil)'}
          </label>
          <select
            value={city}
            disabled={!cityEnabled}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 disabled:bg-stone-100 disabled:text-stone-400 sm:w-auto sm:min-w-[12rem]"
          >
            <option value="">Tüm iller</option>
            {(citiesQ.data?.items ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-stone-600 sm:ml-auto">
          {recipientsQ.isLoading ? (
            'Sayılıyor…'
          ) : (
            <>
              <span className="font-semibold text-stone-900">{count}</span> alıcı eşleşti
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 backdrop-blur">
          <div className="border-b border-stone-200/70 bg-stone-50/70 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Önizleme
          </div>
          <ul className="max-h-[55vh] divide-y divide-stone-100 overflow-y-auto">
            {recipientsQ.isLoading ? (
              <li className="px-5 py-10 text-center text-sm text-stone-400">Yükleniyor…</li>
            ) : items.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-stone-400">Eşleşen kullanıcı yok.</li>
            ) : (
              items.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between px-5 py-2.5 text-sm text-stone-700"
                >
                  <span className="font-medium text-stone-900">
                    {u.first_name} {u.last_name}
                  </span>
                  <span className="text-xs text-stone-400">{u.phone}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 backdrop-blur">
          <div className="border-b border-stone-200/70 bg-stone-50/70 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Mesaj
          </div>
          <div className="px-5 py-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Mesaj metni…"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400"
            />
            <div className="mt-1 text-right text-xs text-stone-400">{body.length} karakter</div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={!canSend}
                onClick={() => {
                  setResult(null)
                  setConfirmOpen(true)
                }}
                className="rounded-full bg-stone-900 px-6 py-2 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tümüne Gönder
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (send.isPending) return
          setConfirmOpen(false)
          setResult(null)
        }}
        title="Toplu Gönderimi Onayla"
        description={
          result
            ? undefined
            : `${ids.length} alıcıya aynı mesaj gönderilecek. Onaylıyor musunuz?`
        }
      >
        {result ? (
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
                onClick={() => {
                  setConfirmOpen(false)
                  setResult(null)
                }}
                className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800"
              >
                Kapat
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={send.isPending}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={send.isPending}
              onClick={() => send.mutate()}
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800 disabled:opacity-50"
            >
              {send.isPending ? 'Gönderiliyor…' : 'Onayla ve Gönder'}
            </button>
          </div>
        )}
        {send.isError && (
          <div className="mt-3 text-sm text-red-600">{(send.error as Error).message}</div>
        )}
      </Modal>
    </AdminShell>
  )
}
