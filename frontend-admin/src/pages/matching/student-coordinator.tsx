import { listMatchingCoordinators } from '@/api/matching'
import { MatchingWorkbench } from '@/components/MatchingWorkbench'

export default function StudentCoordinatorMatchingPage() {
  return (
    <MatchingWorkbench
      type="coordinator"
      eyebrow="Eşleştirme"
      title="Öğrenci ↔ Koordinatör"
      description="Bölgesel koordinatör atamasını ilçe/il bazlı süzgeçle yapın. Mevcut atama değişir."
      targetLabel="Koordinatör"
      accent="emerald"
      loadTargets={listMatchingCoordinators}
      targetsQueryKey="matching-coordinators"
    />
  )
}
