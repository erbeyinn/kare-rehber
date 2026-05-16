import { motion } from "motion/react";

import type { Meeting, MeetingStatus } from "~/api/meetings";
import { Badge } from "~/components/ui/badge";

const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: "Taslak",
  pending: "Onay Bekliyor",
  approved: "Onaylı",
};

const STATUS_TONE: Record<MeetingStatus, "neutral" | "warning" | "success"> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
};

const STATUS_ACCENT: Record<MeetingStatus, string> = {
  draft:
    "linear-gradient(180deg, oklch(from var(--brand-ink-300) l c h / 0.6), transparent)",
  pending:
    "linear-gradient(180deg, oklch(from var(--brand-orange-500) l c h / 0.85), transparent)",
  approved:
    "linear-gradient(180deg, oklch(from var(--brand-blue-500) l c h / 0.85), transparent)",
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

interface MeetingCardProps {
  meeting: Meeting;
  href?: string;
  showStudent?: boolean;
  showCoach?: boolean;
  trailing?: React.ReactNode;
}

export function MeetingCard({
  meeting,
  href,
  showStudent,
  showCoach,
  trailing,
}: MeetingCardProps) {
  const inner = (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="group relative overflow-hidden rounded-(--radius-2xl) border border-border bg-card p-6 shadow-(--shadow-soft) transition-shadow duration-(--duration-base) ease-(--ease-out-expo) hover:shadow-(--shadow-lift)"
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: STATUS_ACCENT[meeting.status] }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100"
        style={{
          background:
            "oklch(from var(--color-accent) l c h / 0.25)",
        }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-(--color-text-faint)">
            {meeting.meeting_date}
          </div>
          {showStudent && meeting.student && (
            <div className="mt-1 text-base font-semibold text-(--color-text-strong)">
              {meeting.student.first_name} {meeting.student.last_name}
            </div>
          )}
          {showCoach && meeting.coach && (
            <div className="mt-1 text-sm text-(--color-text-muted)">
              Koç: {meeting.coach.first_name} {meeting.coach.last_name}
            </div>
          )}
        </div>
        <MeetingStatusBadge status={meeting.status} />
      </div>

      {(meeting.content || meeting.evaluation) && (
        <div className="relative mt-5 space-y-4 text-sm text-(--color-text-muted)">
          {meeting.content && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-(--color-text-faint)">
                İçerik
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-(--color-foreground)">
                {meeting.content}
              </p>
            </div>
          )}
          {meeting.evaluation && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-(--color-text-faint)">
                Değerlendirme
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-(--color-foreground)">
                {meeting.evaluation}
              </p>
            </div>
          )}
        </div>
      )}

      {trailing && (
        <div className="relative mt-5 flex justify-end gap-2">{trailing}</div>
      )}
    </motion.article>
  );

  if (!href) return inner;
  return (
    <a href={href} className="block">
      {inner}
    </a>
  );
}
