import { motion, useReducedMotion } from "motion/react";

import { cn } from "~/lib/utils";

interface AnimatedMeshProps {
  className?: string;
  tone?: "brand" | "warm" | "calm";
}

export function AnimatedMesh({ className, tone = "brand" }: AnimatedMeshProps) {
  const reduce = useReducedMotion();
  const blobs = TONE_BLOBS[tone];

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            background: b.bg,
            width: b.size,
            height: b.size,
            left: b.left,
            top: b.top,
            mixBlendMode: "screen",
            opacity: b.opacity,
          }}
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  x: [0, b.drift.x, 0],
                  y: [0, b.drift.y, 0],
                  scale: [1, 1.1, 1],
                }
          }
          transition={{
            duration: b.duration,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
        />
      ))}
    </div>
  );
}

const TONE_BLOBS = {
  brand: [
    {
      bg: "oklch(from var(--brand-navy-900) l c h / 0.55)",
      size: "32rem",
      left: "-8rem",
      top: "-6rem",
      opacity: 0.6,
      drift: { x: 40, y: 24 },
      duration: 14,
    },
    {
      bg: "oklch(from var(--brand-orange-500) l c h / 0.55)",
      size: "26rem",
      left: "auto",
      top: "30%",
      opacity: 0.45,
      drift: { x: -30, y: -20 },
      duration: 17,
    },
    {
      bg: "oklch(from var(--brand-blue-500) l c h / 0.55)",
      size: "30rem",
      left: "30%",
      top: "55%",
      opacity: 0.5,
      drift: { x: 30, y: -28 },
      duration: 20,
    },
  ],
  warm: [
    {
      bg: "oklch(from var(--brand-orange-500) l c h / 0.55)",
      size: "30rem",
      left: "-6rem",
      top: "-4rem",
      opacity: 0.55,
      drift: { x: 40, y: 24 },
      duration: 18,
    },
    {
      bg: "oklch(from var(--brand-blue-300) l c h / 0.45)",
      size: "26rem",
      left: "55%",
      top: "60%",
      opacity: 0.5,
      drift: { x: -32, y: 20 },
      duration: 22,
    },
  ],
  calm: [
    {
      bg: "oklch(from var(--brand-blue-700) l c h / 0.55)",
      size: "28rem",
      left: "-4rem",
      top: "-4rem",
      opacity: 0.5,
      drift: { x: 28, y: 18 },
      duration: 16,
    },
    {
      bg: "oklch(from var(--brand-navy-900) l c h / 0.55)",
      size: "30rem",
      left: "50%",
      top: "55%",
      opacity: 0.5,
      drift: { x: -30, y: -16 },
      duration: 22,
    },
  ],
} as const;
