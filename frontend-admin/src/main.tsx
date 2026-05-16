/* eslint-disable react-refresh/only-export-components */
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import routes from '~react-pages'

import { AuthProvider } from '@/auth/AuthCtx'
import { ApiError } from '@/api/client'
import { ToastProvider, showToast } from '@/components/Toast'
import './index.css'

function handleError(err: unknown) {
  if (err instanceof ApiError) {
    // 401s already trigger a redirect in apiFetch; don't double-toast.
    if (err.status === 401) return
    showToast(err.message || 'Bir hata oluştu.', 'error')
    return
  }
  if (err instanceof Error) {
    showToast(err.message, 'error')
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
})

function AppRoutes() {
  return useRoutes(routes)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<div className="p-8">Yükleniyor…</div>}>
              <AppRoutes />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
