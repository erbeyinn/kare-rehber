import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'

import { login } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import { ApiError } from '@/api/client'

const schema = z.object({
  email: z.string().min(1, 'Email gerekli').email('Geçersiz email'),
  password: z.string().min(1, 'Şifre gerekli'),
})

type FormValues = z.infer<typeof schema>

type DemoAccount = {
  label: string
  description: string
  email: string
  password: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Ana Admin',
    description: 'Tüm yetkiler — kullanıcı, görüşme, eşleştirme yönetimi',
    email: 'admin@kare.local',
    password: 'Demo1234!',
  },
  {
    label: 'Sistem Yöneticisi',
    description: 'İkinci admin hesabı — log ve raporlama denemeleri için',
    email: 'yonetici@kare.local',
    password: 'Demo1234!',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const { status, signIn } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/dashboard', { replace: true })
    }
  }, [status, navigate])

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  const doLogin = async (email: string, password: string) => {
    setServerError(null)
    try {
      const res = await login(email, password)
      signIn(res.token, res.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError('Email veya şifre hatalı')
      } else {
        setServerError('Giriş başarısız')
      }
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    await doLogin(values.email, values.password)
  })

  const quickLogin = async (acc: DemoAccount) => {
    setValue('email', acc.email)
    setValue('password', acc.password)
    setQuickLoading(acc.email)
    try {
      await doLogin(acc.email, acc.password)
    } finally {
      setQuickLoading(null)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-3xl grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-lg border bg-background p-6 shadow-sm"
        >
          <h1 className="text-xl font-semibold">Admin Girişi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Email ve şifrenizle giriş yapın.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:border-primary"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="password">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:border-primary"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-600" role="alert">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || quickLoading !== null}
              className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </div>
        </form>

        <aside className="rounded-lg border bg-background p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Demo Hesaplar</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Tek tıkla giriş
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Demo amaçlı önceden tanımlı hesaplar. Tıklayınca otomatik giriş yapılır.
          </p>

          <ul className="mt-4 space-y-3">
            {DEMO_ACCOUNTS.map((acc) => {
              const isLoading = quickLoading === acc.email
              return (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => quickLogin(acc)}
                    disabled={isSubmitting || quickLoading !== null}
                    className="w-full text-left rounded-md border bg-background p-3 transition hover:border-primary hover:bg-muted/40 disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-background"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{acc.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {isLoading ? 'Giriş…' : 'Giriş yap →'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {acc.description}
                    </p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-mono">{acc.email}</dd>
                      <dt className="text-muted-foreground">Şifre</dt>
                      <dd className="font-mono">{acc.password}</dd>
                    </dl>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>
    </main>
  )
}
