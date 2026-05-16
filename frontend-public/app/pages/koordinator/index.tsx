import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { motion } from "motion/react";

import { useAuth } from "~/auth/AuthCtx";
import { coordinatorStudents } from "~/api/meetings";
import {
  PageHero,
  SectionHeader,
  EmptyState,
  LoadingBlock,
} from "~/components/PageHero";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

export default function KoordinatorIndex() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["coordinator-students"],
    queryFn: () => coordinatorStudents(),
  });

  const students = data?.items ?? [];

  return (
    <div className="max-w-5xl">
      <PageHero
        eyebrow="Hoş geldin"
        title={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Koordinatör"}
        description="Sana atanan öğrencilerin görüşmelerini taslak/onay-bekliyor durumunda bile görebilirsin."
      />

      <section className="mt-12">
        <SectionHeader
          title="Öğrencilerim"
          meta={isLoading ? "—" : `${students.length} kişi`}
        />

        {isLoading ? (
          <LoadingBlock />
        ) : students.length === 0 ? (
          <EmptyState title="Sana atanan öğrenci henüz yok." />
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2" stagger={0.05}>
            {students.map((s) => (
              <StaggerItem key={s.id}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                >
                  <Link
                    to={`/koordinator/ogrenci/${s.id}`}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-(--radius-2xl) border border-border bg-card p-5 shadow-(--shadow-soft) transition-shadow duration-(--duration-base) ease-(--ease-out-expo) hover:border-accent/40 hover:shadow-(--shadow-lift)"
                  >
                    <div
                      className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100"
                      style={{
                        background:
                          "oklch(from var(--color-secondary) l c h / 0.35)",
                      }}
                    />
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--brand-navy-900), var(--brand-blue-500))",
                      }}
                    >
                      {s.first_name[0]}
                      {s.last_name[0]}
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <div className="truncate text-base font-semibold text-(--color-text-strong)">
                        {s.first_name} {s.last_name}
                      </div>
                      <div className="truncate text-xs text-(--color-text-muted)">
                        {s.phone}
                      </div>
                    </div>
                    <motion.div
                      className="relative text-xs font-medium text-(--color-text-faint) transition-colors group-hover:text-secondary"
                      whileHover={{ x: 4 }}
                    >
                      Aç →
                    </motion.div>
                  </Link>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
