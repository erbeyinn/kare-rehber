import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

interface StaggerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  stagger?: number;
}

export function Stagger({ children, delay = 0, stagger = 0.06, ...rest }: StaggerProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduce ? 0 : stagger,
            delayChildren: reduce ? 0 : delay,
          },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function StaggerItem({ children, ...rest }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.45, ease: [0.19, 1, 0.22, 1] },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
