import { motion } from "motion/react";
import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHero({ eyebrow, title, description, actions }: PageHeroProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
      className="flex flex-wrap items-end justify-between gap-6"
    >
      <div className="max-w-2xl">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-(--color-text-faint)">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-(--color-text-strong) sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-pretty text-sm leading-relaxed text-(--color-text-muted)">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.header>
  );
}

interface SectionHeaderProps {
  title: ReactNode;
  meta?: ReactNode;
}

export function SectionHeader({ title, meta }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-(--color-text-muted)">
        {title}
      </h2>
      {meta && <span className="text-xs text-(--color-text-faint)">{meta}</span>}
    </div>
  );
}

interface EmptyStateProps {
  title: ReactNode;
  hint?: ReactNode;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-(--radius-2xl) border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, oklch(from var(--brand-blue-500) l c h / 0.06), transparent 70%)",
        }}
      />
      <div className="relative text-sm font-medium text-(--color-text-strong)">
        {title}
      </div>
      {hint && (
        <div className="relative mt-1 text-xs text-(--color-text-faint)">
          {hint}
        </div>
      )}
    </div>
  );
}

export function LoadingBlock({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div className="relative overflow-hidden rounded-(--radius-2xl) border border-border bg-card/70 px-6 py-12 text-center">
      <div className="text-sm text-(--color-text-faint)">{label}</div>
    </div>
  );
}
