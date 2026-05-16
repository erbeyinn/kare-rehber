import { Link } from 'react-router-dom'

import { AdminShell } from '@/components/AdminShell'
import { PageHeader } from '@/components/PageHeader'

const reports = [
  {
    to: '/reports/students',
    title: 'Öğrenci Raporu',
    description: 'Öğrenci başına görüşme sayısı, son görüşme tarihi ve atanmış koç.',
  },
  {
    to: '/reports/coaches',
    title: 'Koç Performansı',
    description: 'Koç başına öğrenci sayısı, toplam görüşme ve son 30 günkü aktivite.',
  },
  {
    to: '/reports/cities',
    title: 'İl Dağılımı',
    description: 'İl bazında öğrenci ve atanmış koç sayıları.',
  },
  {
    to: '/reports/meetings',
    title: 'Görüşme Trendi',
    description: 'Tarih aralığı seçerek günlük görüşme adetleri ve statü dağılımı.',
  },
  {
    to: '/reports/missing-meetings',
    title: 'Eksik Görüşmeler',
    description: 'Uzun süredir koçuyla görüşmemiş aktif öğrenciler.',
  },
  {
    to: '/overdue-coaches',
    title: 'Geciken Koçlar',
    description: 'Öğrencisiyle uzun süredir görüşmemiş koçlar (SMS gönderim ekranı).',
  },
]

export default function ReportsIndex() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Raporlar"
        title="Tüm Raporlar"
        description="Karar verirken bakacağınız temel raporlar — filtreler ve detaylar her ekranda mevcut."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="group rounded-2xl border border-stone-200/60 bg-white/70 p-5 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
          >
            <div className="text-base font-semibold tracking-tight text-stone-900">
              {r.title}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{r.description}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-stone-500 transition-colors group-hover:text-stone-900">
              Aç <span aria-hidden>→</span>
            </div>
          </Link>
        ))}
      </div>
    </AdminShell>
  )
}
