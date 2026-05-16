import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import {
  bulkMatch,
  listMatchingCities,
  listMatchingStudents,
  unmatch,
  type MatchTarget,
  type MatchType,
  type MatchingStudent,
} from '@/api/matching'

interface Props {
  type: MatchType
  eyebrow: string
  title: string
  description: string
  /** "Koç" / "Koordinatör" — used in labels and badges. */
  targetLabel: string
  /** Tailwind color slug for accent (e.g. amber, emerald). */
  accent: 'amber' | 'emerald'
  loadTargets: () => Promise<{ items: MatchTarget[] }>
  targetsQueryKey: string
}

export function MatchingWorkbench({
  type,
  eyebrow,
  title,
  description,
  targetLabel,
  accent,
  loadTargets,
  targetsQueryKey,
}: Props) {
  const qc = useQueryClient()

  const [city, setCity] = useState<string>('')
  const [onlyUnmatched, setOnlyUnmatched] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedStudentIDs, setSelectedStudentIDs] = useState<Set<number>>(new Set())
  const [selectedTarget, setSelectedTarget] = useState<MatchTarget | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const citiesQ = useQuery({ queryKey: ['matching-cities'], queryFn: listMatchingCities })
  const studentsQ = useQuery({
    queryKey: ['matching-students', type, city, onlyUnmatched],
    queryFn: () =>
      listMatchingStudents({
        city: city || undefined,
        type,
        unmatched: onlyUnmatched,
      }),
  })
  const targetsQ = useQuery({ queryKey: [targetsQueryKey], queryFn: loadTargets })

  const filteredStudents = useMemo(() => {
    const all = studentsQ.data?.items ?? []
    const q = search.trim().toLocaleLowerCase('tr')
    if (!q) return all
    return all.filter((s) =>
      `${s.first_name} ${s.last_name}`.toLocaleLowerCase('tr').includes(q),
    )
  }, [studentsQ.data, search])

  const targetUsers = targetsQ.data?.items ?? []

  const filteredTargets = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr')
    if (!q) return targetUsers
    return targetUsers.filter((t) =>
      `${t.first_name} ${t.last_name}`.toLocaleLowerCase('tr').includes(q),
    )
  }, [targetUsers, search])

  function toggleStudent(id: number) {
    setSelectedStudentIDs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const ids = filteredStudents.map((s) => s.id)
    setSelectedStudentIDs((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      }
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }

  const assign = useMutation({
    mutationFn: () => {
      if (!selectedTarget) throw new Error('hedef seçilmedi')
      return bulkMatch({
        student_ids: Array.from(selectedStudentIDs),
        target_id: selectedTarget.id,
        type,
      })
    },
    onSuccess: (res) => {
      setToast(
        `${res.count} öğrenci ${selectedTarget?.first_name} ${selectedTarget?.last_name} ile eşleştirildi.`,
      )
      setSelectedStudentIDs(new Set())
      setConfirmOpen(false)
      qc.invalidateQueries({ queryKey: ['matching-students'] })
      setTimeout(() => setToast(null), 3500)
    },
  })

  const remove = useMutation({
    mutationFn: (studentID: number) => unmatch(studentID, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['matching-students'] }),
  })

  const canSubmit = selectedTarget && selectedStudentIDs.size > 0

  const accentBg = accent === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
  const accentRing = accent === 'amber' ? 'ring-amber-400/60' : 'ring-emerald-400/60'
  const accentDot = accent === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <AdminShell>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <Toolbar
        cities={citiesQ.data?.items ?? []}
        city={city}
        onCity={setCity}
        onlyUnmatched={onlyUnmatched}
        onUnmatched={setOnlyUnmatched}
        search={search}
        onSearch={setSearch}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <StudentsPanel
          loading={studentsQ.isLoading}
          students={filteredStudents}
          selected={selectedStudentIDs}
          onToggle={toggleStudent}
          onToggleAll={toggleAll}
          accentBadge={accentBg}
          onUnmatch={(id) => remove.mutate(id)}
          unmatching={remove.isPending ? remove.variables ?? null : null}
          targetLabel={targetLabel}
        />

        <TargetsPanel
          loading={targetsQ.isLoading}
          targets={filteredTargets}
          selected={selectedTarget}
          onSelect={setSelectedTarget}
          targetLabel={targetLabel}
          accentRing={accentRing}
          accentDot={accentDot}
        />
      </div>

      <ActionFooter
        canSubmit={!!canSubmit}
        selectedCount={selectedStudentIDs.size}
        target={selectedTarget}
        targetLabel={targetLabel}
        onClick={() => setConfirmOpen(true)}
      />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Eşleştirmeyi Onayla"
        description={
          selectedTarget
            ? `${selectedStudentIDs.size} öğrenci, ${selectedTarget.first_name} ${selectedTarget.last_name} ile eşleştirilecek. Var olan ${targetLabel.toLocaleLowerCase('tr')} eşleştirmeleri değişecek.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={assign.isPending}
            onClick={() => assign.mutate()}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm text-stone-50 hover:bg-stone-800 disabled:opacity-50"
          >
            {assign.isPending ? 'Eşleştiriliyor…' : 'Eşleştir'}
          </button>
        </div>
        {assign.isError && (
          <div className="mt-3 text-sm text-red-600">{(assign.error as Error).message}</div>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm text-stone-700 shadow-lg">
          {toast}
        </div>
      )}
    </AdminShell>
  )
}

function Toolbar({
  cities,
  city,
  onCity,
  onlyUnmatched,
  onUnmatched,
  search,
  onSearch,
}: {
  cities: string[]
  city: string
  onCity: (v: string) => void
  onlyUnmatched: boolean
  onUnmatched: (v: boolean) => void
  search: string
  onSearch: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-stone-200/60 bg-white/60 px-5 py-4 backdrop-blur">
      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
          İl
        </label>
        <select
          value={city}
          onChange={(e) => onCity(e.target.value)}
          className="min-w-[10rem] rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          <option value="">Tüm iller</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
          Arama
        </label>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Öğrenci veya hedef…"
          className="min-w-[16rem] rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-700 outline-none focus:border-stone-400"
        />
      </div>

      <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-stone-600">
        <input
          type="checkbox"
          checked={onlyUnmatched}
          onChange={(e) => onUnmatched(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
        />
        Sadece eşleştirilmemiş
      </label>
    </div>
  )
}

function StudentsPanel({
  loading,
  students,
  selected,
  onToggle,
  onToggleAll,
  accentBadge,
  onUnmatch,
  unmatching,
  targetLabel,
}: {
  loading: boolean
  students: MatchingStudent[]
  selected: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
  accentBadge: string
  onUnmatch: (id: number) => void
  unmatching: number | null
  targetLabel: string
}) {
  const allSelected = students.length > 0 && students.every((s) => selected.has(s.id))
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-stone-200/70 bg-stone-50/70 px-5 py-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Öğrenciler
          </div>
          <div className="text-xs text-stone-400">{students.length} kayıt</div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-stone-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
            disabled={students.length === 0}
          />
          Hepsini seç
        </label>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-stone-400">Yükleniyor…</div>
      ) : students.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-stone-400">
          Bu filtrede öğrenci yok.
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {students.map((s) => {
            const isSelected = selected.has(s.id)
            const match = matchOf(s, targetLabel)
            return (
              <li
                key={s.id}
                className={
                  'flex items-center gap-4 px-5 py-3 transition-colors ' +
                  (isSelected ? 'bg-stone-50' : 'hover:bg-stone-50/60')
                }
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(s.id)}
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                />
                <div className="flex-1">
                  <div className="font-medium text-stone-900">
                    {s.first_name} {s.last_name}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-400">
                    {[s.city, s.school, s.grade].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {match ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ' +
                        accentBadge
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {match.first_name} {match.last_name}
                    </span>
                    <button
                      type="button"
                      disabled={unmatching === s.id}
                      onClick={() => onUnmatch(s.id)}
                      className="rounded-full border border-stone-200 px-2.5 py-1 text-[11px] text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                      title="Eşleştirmeyi kaldır"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.12em] text-stone-300">
                    eşsiz
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function matchOf(s: MatchingStudent, targetLabel: string) {
  return targetLabel === 'Koç' ? s.coach : s.coordinator
}

function TargetsPanel({
  loading,
  targets,
  selected,
  onSelect,
  targetLabel,
  accentRing,
  accentDot,
}: {
  loading: boolean
  targets: MatchTarget[]
  selected: MatchTarget | null
  onSelect: (t: MatchTarget) => void
  targetLabel: string
  accentRing: string
  accentDot: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
      <div className="border-b border-stone-200/70 bg-stone-50/70 px-5 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
          {targetLabel} havuzu
        </div>
        <div className="text-xs text-stone-400">{targets.length} kayıt</div>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-stone-400">Yükleniyor…</div>
      ) : targets.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-stone-400">
          {targetLabel} bulunamadı.
        </div>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-stone-100 overflow-y-auto">
          {targets.map((t) => {
            const isSelected = selected?.id === t.id
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className={
                    'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ' +
                    (isSelected
                      ? `bg-stone-50 ring-1 ring-inset ${accentRing}`
                      : 'hover:bg-stone-50/60')
                  }
                >
                  <span
                    className={
                      'inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-stone-700 ' +
                      (isSelected ? 'bg-white shadow' : 'bg-stone-100')
                    }
                  >
                    {t.first_name[0]}
                    {t.last_name[0]}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-900">
                      {t.first_name} {t.last_name}
                    </div>
                    <div className="text-xs text-stone-400">
                      {t.specialty || t.phone}
                    </div>
                  </div>
                  {isSelected && <span className={`h-2 w-2 rounded-full ${accentDot}`} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ActionFooter({
  canSubmit,
  selectedCount,
  target,
  targetLabel,
  onClick,
}: {
  canSubmit: boolean
  selectedCount: number
  target: MatchTarget | null
  targetLabel: string
  onClick: () => void
}) {
  return (
    <div className="sticky bottom-6 mt-8 flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white/80 px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,.06)] backdrop-blur">
      <div className="text-sm text-stone-600">
        <span className="font-semibold text-stone-900">{selectedCount}</span> öğrenci seçildi
        {target ? (
          <>
            {' · '}
            <span className="text-stone-500">{targetLabel}:</span>{' '}
            <span className="font-medium text-stone-900">
              {target.first_name} {target.last_name}
            </span>
          </>
        ) : (
          <span className="text-stone-400"> · {targetLabel} seçilmedi</span>
        )}
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onClick}
        className="rounded-full bg-stone-900 px-6 py-2 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Seçilenleri Eşleştir
      </button>
    </div>
  )
}
