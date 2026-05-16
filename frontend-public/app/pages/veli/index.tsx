import { useQuery } from "@tanstack/react-query";

import { useAuth } from "~/auth/AuthCtx";
import { parentMeetings } from "~/api/meetings";
import { MeetingCard } from "~/components/MeetingCard";
import {
  PageHero,
  SectionHeader,
  EmptyState,
  LoadingBlock,
} from "~/components/PageHero";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

export default function VeliIndex() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["parent-meetings"],
    queryFn: () => parentMeetings(),
  });

  return (
    <div className="max-w-4xl">
      <PageHero
        eyebrow="Hoş geldin"
        title={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Veli"}
        description="Çocuğunun koçuyla yaptığı, yönetim tarafından onaylanmış görüşmeleri aşağıda görebilirsin."
      />

      <section className="mt-12">
        <SectionHeader
          title="Görüşmeler"
          meta={isLoading ? "—" : `${data?.items.length ?? 0} kayıt`}
        />

        {isLoading ? (
          <LoadingBlock />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState title="Henüz onaylanmış görüşme yok." />
        ) : (
          <Stagger className="space-y-3" stagger={0.05}>
            {data?.items.map((m) => (
              <StaggerItem key={m.id}>
                <MeetingCard meeting={m} showStudent showCoach />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
