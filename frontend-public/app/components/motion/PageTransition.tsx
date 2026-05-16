import { motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router";
import type { ReactNode } from "react";

const VARIANTS = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  enter: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
};

const REDUCED = {
  initial: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={reduce ? REDUCED : VARIANTS}
      transition={{ duration: 0.34, ease: [0.19, 1, 0.22, 1] }}
      className="will-change-[transform,opacity,filter]"
    >
      {children}
    </motion.div>
  );
}
