import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader, StatusTabs } from '@/components/PageHeader'
import {
  getThread,
  listThreads,
  markThreadRead,
  replyToThread,
  type ThreadSummary,
} from '@/api/messages'
import { useAuth } from '@/auth/useAuth'

type AdminTab = 'mine' | 'pool'

export default function MessagesPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<AdminTab>('mine')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const minePref = isAdmin ? tab === 'mine' : undefined

  const threadsQ = useQuery({
    queryKey: ['admin-messages', 'threads', minePref ?? null],
    queryFn: () => listThreads(minePref),
    refetchInterval: 15_000,
  })

  const items = threadsQ.data?.items ?? []

  useEffect(() => {
    if (selectedId == null && items.length > 0) {
      setSelectedId(items[0].thread_id)
    }
  }, [selectedId, items])

  useEffect(() => {
    // Clear selection when switching tabs so we don't show a thread the user
    // can no longer see in the list.
    setSelectedId(null)
  }, [tab])

  const selectedSummary = useMemo(
    () => items.find((t) => t.thread_id === selectedId) ?? null,
    [items, selectedId],
  )

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Mesajlar"
        title="Gelen Kutusu"
        description={
          isAdmin
            ? 'Veli ve öğrencilerin yönetime gönderdiği mesajları görüntüleyin ve cevaplayın.'
            : 'Öğrenci ve velilerinizin size gönderdiği mesajları görüntüleyin ve cevaplayın.'
        }
      />

      {isAdmin && (
        <StatusTabs
          value={tab}
          onChange={(v) => setTab(v as AdminTab)}
          options={[
            { value: 'mine', label: 'Bana Gelenler' },
            { value: 'pool', label: 'Admin Havuzu' },
          ]}
        />
      )}

      <div className="grid min-h-[32rem] grid-cols-1 gap-4 md:grid-cols-[22rem_1fr]">
        <ThreadList
          threads={items}
          loading={threadsQ.isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          emptyMessage={
            isAdmin && tab === 'mine'
              ? 'Henüz cevap verdiğin konuşma yok.'
              : isAdmin
                ? 'Admin havuzunda mesaj yok.'
                : 'Sana gelen mesaj yok.'
          }
        />
        <ThreadPane
          summary={selectedSummary}
          viewerId={user?.id}
          onSent={() => {
            qc.invalidateQueries({ queryKey: ['admin-messages'] })
          }}
        />
      </div>
    </AdminShell>
  )
}

interface ThreadListProps {
  threads: ThreadSummary[]
  loading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
  emptyMessage: string
}

function ThreadList({ threads, loading, selectedId, onSelect, emptyMessage }: ThreadListProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200/60 bg-white/60 py-10 text-center text-sm text-stone-400">
        Yükleniyor…
      </div>
    )
  }
  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white/40 py-12 text-center text-sm text-stone-500">
        {emptyMessage}
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {threads.map((t) => {
        const isSelected = t.thread_id === selectedId
        const senderLabel = t.other ? `${t.other.first_name} ${t.other.last_name}` : '—'
        return (
          <li key={t.thread_id}>
            <button
              type="button"
              onClick={() => onSelect(t.thread_id)}
              className={
                'w-full rounded-2xl border px-4 py-3 text-left transition ' +
                (isSelected
                  ? 'border-stone-900 bg-white shadow-sm'
                  : 'border-stone-200/70 bg-white/70 hover:border-stone-300')
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-stone-900">{senderLabel}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  {t.recipient_role === 'admin' ? 'Yönetim' : 'Koord.'}
                </span>
              </div>
              <div className="mt-1 line-clamp-2 text-sm text-stone-600">
                {t.last_message.body}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {formatDateTime(t.last_message.created_at)}
                </span>
                {t.unread_count > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    {t.unread_count}
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

interface ThreadPaneProps {
  summary: ThreadSummary | null
  viewerId?: number
  onSent: () => void
}

function ThreadPane({ summary, viewerId, onSent }: ThreadPaneProps) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const threadId = summary?.thread_id ?? null

  const threadQ = useQuery({
    queryKey: ['admin-messages', 'thread', threadId],
    queryFn: () => getThread(threadId as number),
    enabled: threadId !== null,
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (threadId == null || !summary) return
    if (summary.unread_count > 0) {
      markThreadRead(threadId)
        .then(() => {
          qc.invalidateQueries({ queryKey: ['admin-messages'] })
        })
        .catch(() => undefined)
    }
  }, [threadId, summary, qc])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [threadQ.data])

  const replyMut = useMutation({
    mutationFn: () => replyToThread(threadId as number, body),
    onSuccess: () => {
      setBody('')
      qc.invalidateQueries({ queryKey: ['admin-messages', 'thread', threadId] })
      onSent()
    },
  })

  if (!summary || threadId == null) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/40 py-12 text-center text-sm text-stone-500">
        Bir konuşma seçin.
      </div>
    )
  }

  const otherName = summary.other
    ? `${summary.other.first_name} ${summary.other.last_name}`
    : '—'

  return (
    <div className="flex flex-col rounded-2xl border border-stone-200/70 bg-white/80">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
            Gönderen
          </div>
          <div className="text-sm font-semibold text-stone-900">{otherName}</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-600">
            {summary.recipient_role === 'admin' ? 'Yönetim' : 'Koordinatör'}
          </span>
          <span>#{summary.thread_id}</span>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-5 py-4"
        style={{ maxHeight: '36rem' }}
      >
        {threadQ.isLoading ? (
          <div className="text-sm text-stone-400">Yükleniyor…</div>
        ) : (
          (threadQ.data?.items ?? []).map((m) => {
            const mine = viewerId != null && m.sender_id === viewerId
            return (
              <div key={m.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ' +
                    (mine ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800')
                  }
                >
                  {!mine && (
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      {m.sender_name ?? '—'}
                      {m.sender_role ? ` · ${roleLabel(m.sender_role)}` : ''}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div
                    className={
                      'mt-1 text-[10px] ' + (mine ? 'text-stone-300' : 'text-stone-400')
                    }
                  >
                    {formatDateTime(m.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t border-stone-100 px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!body.trim()) return
          replyMut.mutate()
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Cevabınızı yazın…"
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
        />
        <button
          type="submit"
          disabled={!body.trim() || replyMut.isPending}
          className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {replyMut.isPending ? 'Gönderiliyor…' : 'Cevapla'}
        </button>
      </form>
      {replyMut.isError && (
        <div className="border-t border-rose-100 bg-rose-50 px-5 py-2 text-xs text-rose-700">
          {(replyMut.error as Error)?.message ?? 'Gönderilemedi'}
        </div>
      )}
    </div>
  )
}

function roleLabel(role: string): string {
  switch (role) {
    case 'student':
      return 'Öğrenci'
    case 'parent':
      return 'Veli'
    case 'admin':
      return 'Yönetim'
    case 'coordinator':
      return 'Koordinatör'
    case 'coach':
      return 'Koç'
    default:
      return role
  }
}

function formatDateTime(s: string): string {
  try {
    const d = new Date(s)
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return s
  }
}
