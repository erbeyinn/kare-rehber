import { listMatchingCoaches } from '@/api/matching'
import { MatchingWorkbench } from '@/components/MatchingWorkbench'

export default function StudentCoachMatchingPage() {
  return (
    <MatchingWorkbench
      type="coach"
      eyebrow="Eşleştirme"
      title="Öğrenci ↔ Koç"
      description="İl bazlı süzgeçle öğrencileri seçin, bir koç belirleyin ve toplu eşleştirin. Var olan koç eşleştirmesi değişir."
      targetLabel="Koç"
      accent="amber"
      loadTargets={listMatchingCoaches}
      targetsQueryKey="matching-coaches"
    />
  )
}
