import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

export default function PlaceholderPage({ titleKey, description }: { titleKey: string; description: string }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t(titleKey)}</h1>
      <Card className="text-center py-16">
        <div className="text-5xl mb-4">🚧</div>
        <p className="text-muted">{description}</p>
        <p className="text-xs text-subtle mt-2">Ready for Flask backend integration</p>
      </Card>
    </div>
  )
}
