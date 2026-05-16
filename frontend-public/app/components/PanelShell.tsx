import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

import { useAuth, ROLE_HOME } from "~/auth/AuthCtx";
import type { Role } from "~/api/auth";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { BrandMark } from "~/components/motion/BrandMark";
import { PageTransition } from "~/components/motion/PageTransition";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Yönetim",
  coordinator: "Koordinatör",
  coach: "Koç",
  student: "Öğrenci",
  parent: "Veli",
};

interface PanelShellProps {
  role: Role;
  title: string;
  nav?: ReactNode;
}

export function PanelShell({ role, title, nav }: PanelShellProps) {
  const { status, user, signOut } = useAuth();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="relative flex min-h-screen bg-(--color-surface-sunken)">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 40% at 0% 0%, oklch(from var(--brand-navy-900) l c h / 0.04), transparent 70%), radial-gradient(50% 35% at 100% 100%, oklch(from var(--brand-orange-500) l c h / 0.04), transparent 70%)",
        }}
      />

      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden lg:flex bg-sidebar text-sidebar-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(80% 50% at 0% 0%, oklch(from var(--brand-blue-500) l c h / 0.35), transparent 60%), radial-gradient(60% 50% at 100% 100%, oklch(from var(--brand-orange-500) l c h / 0.22), transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col">
          <div className="px-7 pt-8 pb-6">
            <BrandMark tone="dark" />
          </div>

          <div className="px-7 pb-4">
            <Badge tone="outline" className="border-white/20 text-white/80">
              {ROLE_LABEL[role]} paneli
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {title}
            </h1>
          </div>

          <nav className="mt-2 flex-1 overflow-y-auto px-4">{nav}</nav>

          <div className="mx-4 mb-5 mt-4 rounded-(--radius-xl) border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <motion.div
                initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand-orange-500), oklch(from var(--brand-orange-500) calc(l + 0.18) c h))",
                  color: "var(--brand-navy-900)",
                }}
              >
                {initials || "•"}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {user.first_name} {user.last_name}
                </div>
                <div className="truncate text-[11px] text-white/55">
                  {user.phone}
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={signOut}
              variant="outline"
              size="sm"
              className="mt-3 w-full border-white/15 bg-white/5 text-white hover:bg-white/12 hover:text-white"
            >
              Çıkış yap
            </Button>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-1 flex-col">
        <motion.header
          initial={false}
          animate={{
            backdropFilter: scrolled ? "blur(14px)" : "blur(0px)",
            backgroundColor: scrolled
              ? "oklch(from var(--color-background) l c h / 0.78)"
              : "oklch(from var(--color-background) l c h / 0)",
            borderColor: scrolled
              ? "oklch(from var(--color-border) l c h / 0.6)"
              : "oklch(from var(--color-border) l c h / 0)",
          }}
          transition={{ duration: 0.24, ease: [0.19, 1, 0.22, 1] }}
          className="sticky top-0 z-30 border-b"
        >
          <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <BrandMark tone="light" showWordmark={false} />
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-(--color-text-faint)">
                  {ROLE_LABEL[role]}
                </div>
                <div className="text-sm font-semibold text-(--color-text-strong)">
                  {title}
                </div>
              </div>
            </div>
            <div className="hidden text-sm text-(--color-text-muted) lg:block">
              {title}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-medium text-(--color-text-strong) sm:inline">
                {user.first_name} {user.last_name}
              </span>
              <Button
                type="button"
                onClick={signOut}
                variant="outline"
                size="sm"
                className="lg:hidden"
              >
                Çıkış
              </Button>
            </div>
          </div>
        </motion.header>

        {nav && (
          <div className="px-5 pt-4 sm:px-8 lg:hidden">
            <div className="rounded-(--radius-xl) border border-border bg-card p-2 shadow-(--shadow-soft)">
              {nav}
            </div>
          </div>
        )}

        <main className="relative flex-1 px-5 py-8 sm:px-8 sm:py-10">
          <AnimatePresence mode="wait">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function LoadingScreen() {
  const reduce = useReducedMotion();
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-surface-sunken)">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="h-10 w-10 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, var(--brand-orange-500), var(--brand-blue-500), var(--brand-navy-900), var(--brand-orange-500))",
            WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
            mask: "radial-gradient(circle, transparent 55%, black 56%)",
          }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <div className="text-[11px] uppercase tracking-[0.22em] text-(--color-text-faint)">
          Yükleniyor
        </div>
      </div>
    </main>
  );
}

interface PanelLinkProps {
  active: boolean;
  children: ReactNode;
}

export function PanelLinkInner({ active, children }: PanelLinkProps) {
  return (
    <span
      className={[
        "relative flex items-center gap-3 rounded-(--radius-md) px-3.5 py-2.5",
        "text-sm font-medium transition-colors duration-(--duration-fast) ease-(--ease-out-expo)",
        active
          ? "text-white"
          : "text-white/65 hover:text-white",
      ].join(" ")}
    >
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="panel-nav-active"
            className="absolute inset-0 rounded-(--radius-md)"
            style={{
              background:
                "linear-gradient(135deg, oklch(from var(--brand-orange-500) l c h / 0.95), oklch(from var(--brand-blue-500) l c h / 0.85))",
              boxShadow:
                "0 12px 30px -16px oklch(from var(--brand-orange-500) l c h / 0.6)",
            }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
          />
        )}
      </AnimatePresence>
      <span className="relative flex items-center gap-3">{children}</span>
    </span>
  );
}

// Re-export to keep PageTransition usable inside layouts if needed.
export { useLocation };
