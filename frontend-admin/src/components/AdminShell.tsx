import type { ReactNode } from 'react'
import { Navigate, NavLink } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import type { Role } from '@/api/auth'

interface NavItem {
  to: string
  label: string
}

interface NavSection {
  label: string
  items: NavItem[]
  roles?: Role[]
}

const navSections: NavSection[] = [
  {
    label: 'Genel',
    items: [
      { to: '/dashboard', label: 'Panel' },
      { to: '/reports', label: 'Raporlar' },
    ],
    roles: ['admin'],
  },
  {
    label: 'Kullanıcılar',
    items: [
      { to: '/users/students', label: 'Öğrenciler' },
      { to: '/users/coaches', label: 'Koçlar' },
      { to: '/users/coordinators', label: 'Koordinatörler' },
      { to: '/users/admins', label: 'Yöneticiler' },
    ],
    roles: ['admin'],
  },
  {
    label: 'Eşleştirme',
    items: [
      { to: '/matching/student-coach', label: 'Öğrenci ↔ Koç' },
      { to: '/matching/student-coordinator', label: 'Öğrenci ↔ Koordinatör' },
    ],
    roles: ['admin'],
  },
  {
    label: 'Görüşmeler',
    items: [
      { to: '/meetings', label: 'Onaylar' },
      { to: '/overdue-coaches', label: 'Geciken Koçlar' },
    ],
    roles: ['admin'],
  },
  {
    label: 'SMS',
    items: [
      { to: '/sms/individual', label: 'Bireysel' },
      { to: '/sms/bulk', label: 'Toplu' },
    ],
    roles: ['admin'],
  },
  {
    label: 'İletişim',
    items: [{ to: '/messages', label: 'Mesajlar' }],
    roles: ['admin', 'coordinator'],
  },
  {
    label: 'Sistem',
    items: [{ to: '/logs', label: 'Audit Log' }],
    roles: ['admin'],
  },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const { status, user, signOut } = useAuth()

  if (status === 'loading') {
    return <div className="p-8 text-stone-500">Yükleniyor…</div>
  }
  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace />
  }

  const visibleSections = navSections.filter(
    (s) => !s.roles || s.roles.includes(user.role),
  )

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-800">
      <aside className="w-64 border-r border-stone-200/70 bg-white/60 px-5 py-7 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <div className="h-2 w-2 rounded-full bg-stone-900" />
          <div className="text-base font-semibold tracking-tight text-stone-900">Kare Rehber</div>
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-stone-400">Yönetim</div>

        <nav className="mt-8 space-y-6">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      'block rounded-lg px-3 py-2 text-sm transition-colors ' +
                      (isActive
                        ? 'bg-stone-900 text-stone-50'
                        : 'text-stone-600 hover:bg-stone-100')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200/70 bg-white/40 px-8 py-4 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-400">Admin</div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-700">
                {user.first_name[0]}
                {user.last_name[0]}
              </div>
              <span className="text-stone-700">
                {user.first_name} {user.last_name}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100"
            >
              Çıkış
            </button>
          </div>
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
