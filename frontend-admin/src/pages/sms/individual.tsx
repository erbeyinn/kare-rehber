import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { searchUsers, sendIndividualSMS, type SMSRecipient } from '@/api/sms'

export default function IndividualSMSPage() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<SMSRecipient | null>(null)
  const [body, setBody] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = useQuery({
    queryKey: ['sms-users', debounced],
    queryFn: () => searchUsers(debounced),
    enabled: debounced.length >= 2,
  })

  const send = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Alıcı seçilmedi')
      return sendIndividualSMS(selected.id, body)
    },
    onSuccess: () => {
      setToast(`SMS gönderildi: ${selected?.first_name} ${selected?.last_name}`)
      setBody('')
      setTimeout(() => setToast(null), 3500)
    },
  })

  const items = data?.items ?? []
  const canSend = !!selected && body.trim().length > 0 && !send.isPending

  return (
    <AdminShell>
      <PageHeader
        eyebrow="SMS"
        title="Bireysel SMS"
        description="Bir kullanıcıyı arayıp seçin, mesajınızı yazın ve gönderin."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 backdrop-blur">
          <div className="border-b border-stone-200/70 bg-stone-50/70 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Alıcı
          </div>
          <div className="px-5 py-4">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ad veya telefon ile ara…"
              className="w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 outline-none focus:border-stone-400"
            />
            <div className="mt-3 max-h-80 overflow-y-auto">
              {debounced.length < 2 ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  En az 2 karakter girin.
                </div>
              ) : isFetching ? (
                <div className="py-6 text-center text-xs text-stone-400">Aranıyor…</div>
              ) : items.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400">Eşleşme yok.</div>
              ) : (
                <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200/60">
                  {items.map((u) => {
                    const isSel = selected?.id === u.id
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(u)}
                          className={
                            'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ' +
                            (isSel ? 'bg-stone-100' : 'hover:bg-stone-50')
                          }
                        >
                          <span>
                            <span className="font-medium text-stone-900">
                              {u.first_name} {u.last_name}
                            </span>
                            <span className="ml-2 text-xs text-stone-400">{u.phone}</span>
                          </span>
                          {isSel && (
                            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                              Seçildi
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 backdrop-blur">
          <div className="border-b border-stone-200/70 bg-stone-50/70 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Mesaj
          </div>
          <div className="px-5 py-4">
            {selected ? (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                <span className="font-medium">
                  {selected.first_name} {selected.last_name}
                </span>
                <span className="text-stone-400">{selected.phone}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="ml-1 rounded-full text-stone-400 hover:text-stone-700"
                  title="Kaldır"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="mb-4 text-xs text-stone-400">Önce bir alıcı seçin.</div>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Mesaj metni…"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-stone-400">
              <span>{body.length} karakter</span>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={!canSend}
                onClick={() => send.mutate()}
                className="rounded-full bg-stone-900 px-6 py-2 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {send.isPending ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
            {send.isError && (
              <div className="mt-3 text-sm text-red-600">{(send.error as Error).message}</div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm text-stone-700 shadow-lg">
          {toast}
        </div>
      )}
    </AdminShell>
  )
}
