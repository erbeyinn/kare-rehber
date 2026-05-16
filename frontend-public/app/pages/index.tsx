import { Navigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";

import { useAuth, ROLE_HOME } from "~/auth/AuthCtx";

export default function Index() {
  const { status, user } = useAuth();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status === "authenticated" && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <Navigate to="/login" replace />;
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
