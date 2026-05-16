import { useQuery } from "@tanstack/react-query";

import { useAuth } from "~/auth/AuthCtx";
import { myMatches, type MatchedUser } from "~/api/matches";
import { studentMeetings } from "~/api/meetings";
import { MeetingCard } from "~/components/MeetingCard";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  PageHero,
  SectionHeader,
  EmptyState,
  LoadingBlock,
} from "~/components/PageHero";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

export default function OgrenciIndex() {
  const { user } = useAuth();
  const matchesQ = useQuery({
    queryKey: ["my-matches"],
    queryFn: () => myMatches(),
  });
  const meetingsQ = useQuery({
    queryKey: ["student-meetings"],
    queryFn: () => studentMeetings(),
  });

  return (
    <div className="max-w-4xl">
      <PageHero
        eyebrow="Hoş geldin"
        title={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Öğrenci"}
        description="Atanan koçun ve koordinatörün burada görünür. Aşağıda onaylanmış görüşme kayıtlarını okuyabilirsin."
      />

      <Stagger className="mt-10 grid gap-5 sm:grid-cols-2" stagger={0.08}>
        <StaggerItem>
          <MentorCard
            label="Koçun"
            tone="accent"
            mentor={matchesQ.data?.coach}
            loading={matchesQ.isLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <MentorCard
            label="Koordinatörün"
            tone="primary"
            mentor={matchesQ.data?.coordinator}
            loading={matchesQ.isLoading}
          />
        </StaggerItem>
      </Stagger>

      <section className="mt-12">
        <SectionHeader
          title="Görüşmeler"
          meta={meetingsQ.isLoading ? "—" : `${meetingsQ.data?.items.length ?? 0} kayıt`}
        />

        {meetingsQ.isLoading ? (
          <LoadingBlock />
        ) : (meetingsQ.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Henüz onaylanmış görüşme yok."
            hint="Koçunla görüşmeler yapıldıkça burada birikecek."
          />
        ) : (
          <Stagger className="space-y-3" stagger={0.05}>
            {meetingsQ.data?.items.map((m) => (
              <StaggerItem key={m.id}>
                <MeetingCard meeting={m} showCoach />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}

interface MentorCardProps {
  label: string;
  tone: "accent" | "primary" | "secondary";
  mentor?: MatchedUser;
  loading: boolean;
}

function MentorCard({ label, tone, mentor, loading }: MentorCardProps) {
  const accentBg =
    tone === "accent"
      ? "oklch(from var(--brand-orange-500) l c h / 0.18)"
      : tone === "primary"
        ? "oklch(from var(--brand-navy-900) l c h / 0.18)"
        : "oklch(from var(--brand-blue-500) l c h / 0.18)";

  return (
    <Card className="relative p-6">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl"
        style={{ background: accentBg }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <Badge tone={tone}>{label}</Badge>
      </div>

      {loading ? (
        <div className="relative mt-6 text-sm text-(--color-text-faint)">
          Yükleniyor…
        </div>
      ) : mentor ? (
        <div className="relative mt-5 flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-navy-900), var(--brand-blue-500))",
              color: "white",
            }}
          >
            {mentor.first_name[0]}
            {mentor.last_name[0]}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-(--color-text-strong)">
              {mentor.first_name} {mentor.last_name}
            </div>
            <a
              href={`tel:${mentor.phone}`}
              className="mt-0.5 inline-block text-sm font-medium text-primary hover:underline"
            >
              {mentor.phone}
            </a>
          </div>
        </div>
      ) : (
        <div className="relative mt-6 text-sm text-(--color-text-muted)">
          Henüz atama yapılmadı. En kısa sürede bilgilendirileceksin.
        </div>
      )}
    </Card>
  );
}
