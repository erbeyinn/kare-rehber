import { motion, useReducedMotion } from "motion/react";

import { cn } from "~/lib/utils";

interface BrandMarkProps {
  className?: string;
  showWordmark?: boolean;
  tone?: "light" | "dark";
}

export function BrandMark({ className, showWordmark = true, tone = "light" }: BrandMarkProps) {
  const reduce = useReducedMotion();

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <motion.div
        className="relative flex h-10 w-10 items-center justify-center rounded-(--radius-md) overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-navy-900), var(--brand-blue-500))",
        }}
        initial={reduce ? false : { rotate: -8, scale: 0.9, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        whileHover={reduce ? undefined : { rotate: 4 }}
      >
        <motion.span
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, oklch(from var(--brand-orange-500) l c h / 0.9), transparent 55%)",
          }}
          animate={
            reduce
              ? undefined
              : { opacity: [0.6, 1, 0.6] }
          }
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <svg
          viewBox="0 0 24 24"
          className="relative h-5 w-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="7" height="7" rx="1.4" />
          <rect x="13" y="4" width="7" height="7" rx="1.4" />
          <rect x="4" y="13" width="7" height="7" rx="1.4" />
          <rect x="13" y="13" width="7" height="7" rx="1.4" />
        </svg>
      </motion.div>
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "text-sm font-semibold tracking-tight",
              tone === "light" ? "text-(--color-text-strong)" : "text-white",
            )}
          >
            Kare Rehber
          </span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.22em]",
              tone === "light" ? "text-(--color-text-faint)" : "text-white/60",
            )}
          >
            Mentörlük Platformu
          </span>
        </div>
      )}
    </div>
  );
}
