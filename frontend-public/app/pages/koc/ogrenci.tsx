import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import {
  coachStudents,
  coachStudentMeetings,
  type AssignedStudent,
} from "~/api/meetings";
import { MeetingCard } from "~/components/MeetingCard";
import { buttonVariants } from "~/components/ui/button";
import {
  PageHero,
  SectionHeader,
  EmptyState,
  LoadingBlock,
} from "~/components/PageHero";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

export default function KocOgrenciDetail() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);

  const studentsQ = useQuery({
    queryKey: ["coach-students"],
    queryFn: () => coachStudents(),
  });
  const meetingsQ = useQuery({
    queryKey: ["coach-student-meetings", studentId],
    queryFn: () => coachStudentMeetings(studentId),
    enabled: Number.isFinite(studentId),
  });

  const student: AssignedStudent | undefined = studentsQ.data?.items.find(
    (s) => s.id === studentId,
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-(--color-text-faint)">
        <Link to="/koc" className="transition-colors hover:text-(--color-text-strong)">
          Öğrencilerim
        </Link>{" "}
        · Detay
      </div>

      <PageHero
        eyebrow={student?.phone ?? "Öğrenci"}
        title={student ? `${student.first_name} ${student.last_name}` : "Öğrenci"}
        description={
          student && (student.school || student.grade || student.city)
            ? [student.school, student.grade, student.city].filter(Boolean).join(" · ")
            : undefined
        }
        actions={
          <Link
            to={`/koc/gorusme/new?student_id=${studentId}`}
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            Yeni Görüşme
          </Link>
        }
      />

      <section className="mt-10">
        <SectionHeader
          title="Görüşme Geçmişi"
          meta={meetingsQ.isLoading ? "—" : `${meetingsQ.data?.items.length ?? 0} kayıt`}
        />

        {meetingsQ.isLoading ? (
          <LoadingBlock />
        ) : (meetingsQ.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Bu öğrenci için henüz görüşme kaydı yok."
            hint="“Yeni Görüşme” ile ilk görüşmeyi başlat."
          />
        ) : (
          <Stagger className="space-y-3" stagger={0.05}>
            {meetingsQ.data?.items.map((m) => (
              <StaggerItem key={m.id}>
                <MeetingCard meeting={m} href={`/koc/gorusme/${m.id}`} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
