import { useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Route } from "./+types/root";
import { AuthProvider } from "~/auth/AuthCtx";
import { buttonVariants } from "~/components/ui/button";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#09347a" />
        <Meta />
        <Links />
      </head>
      <body className="antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Beklenmedik bir hata";
  let details = "Bir sorun oluştu, lütfen tekrar deneyin.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : `${error.status}`;
    details =
      error.status === 404
        ? "Aradığın sayfa bulunamadı."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-(--color-surface-sunken) px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 20%, oklch(from var(--brand-navy-900) l c h / 0.18), transparent 60%), radial-gradient(50% 40% at 80% 80%, oklch(from var(--brand-orange-500) l c h / 0.18), transparent 60%)",
        }}
      />
      <div className="relative max-w-lg text-center">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-(--color-text-faint)">
          {message}
        </div>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-(--color-text-strong) sm:text-4xl">
          {details}
        </h1>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/" className={buttonVariants({ variant: "primary", size: "md" })}>
            Ana sayfa
          </a>
          <a
            href="/login"
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            Giriş
          </a>
        </div>
        {stack && (
          <pre className="mt-8 max-h-64 overflow-auto rounded-(--radius-xl) border border-border bg-card p-4 text-left text-xs text-(--color-text-muted)">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
