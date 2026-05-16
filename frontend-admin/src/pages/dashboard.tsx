import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'
import { getOverview, type Overview } from '@/api/reports'
import { useAuth } from '@/auth/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
  })

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Genel Bakış"
        title={`Hoşgeldin ${user?.first_name ?? ''}`}
        description="Sistemin anlık durumu — kullanıcı, görüşme ve bekleyen onay sayıları."
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            {isFetching ? 'Yenileniyor…' : 'Yenile'}
          </button>
        }
      />

      {isError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-3 text-sm text-rose-700">
          Veriler getirilemedi. Tekrar deneyin.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Öğrenci"
          value={data?.students_total}
          sub={data ? `${data.students_active} aktif · ${data.students_inactive} pasif` : undefined}
          loading={isLoading}
        />
        <StatCard
          label="Koç"
          value={data?.coaches_total}
          sub={data ? `${data.coaches_active} aktif · ${data.coaches_inactive} pasif` : undefined}
          loading={isLoading}
        />
        <StatCard
          label="Bu Hafta Görüşme"
          value={data?.meetings_this_week}
          sub="Pazartesi'den bugüne"
          loading={isLoading}
        />
        <StatCard
          label="Bekleyen Onay"
          value={data?.pending_approvals}
          sub="Görüşme onayı bekliyor"
          accent={data && data.pending_approvals > 0}
          loading={isLoading}
          href="/meetings"
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniCard label="Koordinatör" value={data?.coordinators_total} loading={isLoading} />
        <MiniCard label="Yönetici" value={data?.admins_total} loading={isLoading} />
        <div className="rounded-2xl border border-stone-200/60 bg-white/60 p-5 backdrop-blur">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">Hızlı Bağlantılar</div>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><DashLink to="/reports">Tüm raporlar</DashLink></li>
            <li><DashLink to="/overdue-coaches">Geciken koçlar</DashLink></li>
            <li><DashLink to="/logs">Audit log</DashLink></li>
          </ul>
        </div>
      </div>
    </AdminShell>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
  loading,
  href,
}: {
  label: string
  value?: Overview[keyof Overview]
  sub?: string
  accent?: boolean
  loading?: boolean
  href?: string
}) {
  const body = (
    <div
      className={
        'rounded-2xl border bg-white/80 px-5 py-5 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur transition ' +
        (accent ? 'border-amber-300/70 bg-amber-50/60' : 'border-stone-200/60 hover:bg-white')
      }
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
        {loading ? <Skeleton className="h-8 w-16" /> : value ?? 0}
      </div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  )
  if (href && !loading) {
    return <Link to={href}>{body}</Link>
  }
  return body
}

function MiniCard({ label, value, loading }: { label: string; value?: number; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white/60 px-5 py-4 backdrop-blur">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-stone-900">
        {loading ? <Skeleton className="h-7 w-12" /> : value ?? 0}
      </div>
    </div>
  )
}

function DashLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-stone-600 transition-colors hover:text-stone-900"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 transition-colors group-hover:bg-stone-900" />
      {children}
    </Link>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-stone-200/80 ${className ?? ''}`} />
}
