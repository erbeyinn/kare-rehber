import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, useLocation } from 'react-router-dom'

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  if (status === 'loading') {
    return <div className="p-8 text-stone-500">Yükleniyor…</div>
  }
  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace />
  }

  const visibleSections = navSections.filter(
    (s) => !s.roles || s.roles.includes(user.role),
  )

  const sidebar = (
    <>
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
    </>
  )

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-800">
      <aside className="hidden w-64 shrink-0 border-r border-stone-200/70 bg-white/60 px-5 py-7 backdrop-blur lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-r border-stone-200/70 bg-white px-5 py-7 shadow-2xl transition-transform duration-200 ease-out lg:hidden ' +
          (mobileOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Menü</div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
            aria-label="Menüyü kapat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200/70 bg-white/40 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 lg:py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-100 lg:hidden"
              aria-label="Menüyü aç"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="text-xs uppercase tracking-[0.2em] text-stone-400">Admin</div>
          </div>
          <div className="flex items-center gap-3 text-sm sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-700">
                {user.first_name[0]}
                {user.last_name[0]}
              </div>
              <span className="hidden text-stone-700 sm:inline">
                {user.first_name} {user.last_name}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 sm:px-4"
            >
              Çıkış
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
