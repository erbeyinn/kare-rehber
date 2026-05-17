import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { listLogs, type AuditLog } from '@/api/logs'

const ENTITY_LABELS: Record<string, string> = {
  meeting: 'Görüşme',
  user: 'Kullanıcı',
  match: 'Eşleştirme',
  message: 'Mesaj',
  sms: 'SMS',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Oluştur',
  update: 'Güncelle',
  approve: 'Onayla',
  delete: 'Sil',
  status_change: 'Statü değişimi',
}

export default function LogsPage() {
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [actorId, setActorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const q = useQuery({
    queryKey: ['logs', entityType, entityId, actorId, from, to],
    queryFn: () =>
      listLogs({
        entityType: entityType || undefined,
        entityId: entityId ? Number(entityId) : undefined,
        actorId: actorId ? Number(actorId) : undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  })

  const rows = useMemo(() => q.data?.items ?? [], [q.data])

  function reset() {
    setEntityType('')
    setEntityId('')
    setActorId('')
    setFrom('')
    setTo('')
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Sistem"
        title="Audit Log"
        description="Sistemde yapılan değişikliklerin geçmişi — kim, ne zaman, neyi değiştirdi."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-stone-200/60 bg-white/60 px-4 py-4 backdrop-blur sm:flex sm:flex-wrap sm:items-end sm:gap-4 sm:px-5">
        <FilterField label="Entity">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-44"
          >
            <option value="">Tümü</option>
            {Object.entries(ENTITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Entity ID">
          <input
            type="number"
            min={1}
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-28"
          />
        </FilterField>
        <FilterField label="Actor ID">
          <input
            type="number"
            min={1}
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-28"
          />
        </FilterField>
        <FilterField label="Başlangıç">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-auto"
          />
        </FilterField>
        <FilterField label="Bitiş">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400 sm:w-auto"
          />
        </FilterField>
        <button
          type="button"
          onClick={reset}
          className="col-span-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100 sm:col-span-1"
        >
          Sıfırla
        </button>
        <div className="col-span-2 text-sm text-stone-500 sm:col-span-1 sm:ml-auto">
          {q.isLoading ? '' : `${rows.length} kayıt`}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-stone-200/70 bg-stone-50/70 text-left">
              <Th>Zaman</Th>
              <Th>Aktör</Th>
              <Th>İşlem</Th>
              <Th>Entity</Th>
              <Th>Diff</Th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-5 py-3">
                      <div className="h-3.5 w-3/5 animate-pulse rounded bg-stone-200/80" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-stone-400">
                  Kayıt yok.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60">
                  <td className="px-5 py-3 align-middle text-stone-700">{formatTs(r.created_at)}</td>
                  <td className="px-5 py-3 align-middle text-stone-700">
                    {r.actor ? (
                      <span>
                        {r.actor.first_name} {r.actor.last_name}
                        <span className="ml-2 text-xs text-stone-400">#{r.actor.id}</span>
                      </span>
                    ) : (
                      <span className="text-stone-400">Sistem</span>
                    )}
                  </td>
                  <td className="px-5 py-3 align-middle">
                    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                      {ACTION_LABELS[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 align-middle text-stone-700">
                    {ENTITY_LABELS[r.entity_type] ?? r.entity_type}
                    <span className="ml-2 text-xs text-stone-400">#{r.entity_id}</span>
                  </td>
                  <td className="px-5 py-3 align-middle">
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-100"
                    >
                      Aç
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${ENTITY_LABELS[selected.entity_type] ?? selected.entity_type} #${selected.entity_id}` : ''}
        description={selected ? `${ACTION_LABELS[selected.action] ?? selected.action} · ${formatTs(selected.created_at)}` : undefined}
      >
        {selected && (
          <pre className="max-h-[60vh] overflow-auto rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-800">
            {JSON.stringify(selected.diff, null, 2)}
          </pre>
        )}
      </Modal>
    </AdminShell>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">{label}</label>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
      {children}
    </th>
  )
}

function formatTs(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
