import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { cropOptions, fetchCropPricePrediction, type CropPrediction } from '@/utils/cropPricePrediction'
import { formatCurrency } from '@/utils/cn'

export default function FarmerAnalytics() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [selectedCrop, setSelectedCrop] = useState('tomato')
  const [products, setProducts] = useState<string[]>([])
  const [prediction, setPrediction] = useState<CropPrediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchCropPricePrediction(selectedCrop).then(setPrediction).catch((error: Error) => setPrediction({ crop: selectedCrop, currentPrice: 0, predictedPrice: 0, confidence: 0, change: 0, history: [], error: error.message })).finally(() => setLoading(false))
  }, [selectedCrop])

  useEffect(() => {
    if (!userId) return
    api.get(`/products/farmer/${userId}`).then((response) => {
      const names = (response.data.products || []).map((product: { name?: string }) => product.name?.trim().toLowerCase()).filter(Boolean)
      setProducts(Array.from(new Set(names)) as string[])
    }).catch(() => setProducts([]))
  }, [userId])

  const availableCrops = Array.from(new Set([...cropOptions, ...products]))

  const maxPrice = prediction?.history.length ? Math.max(...prediction.history.map((point) => point.price)) : 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.analytics')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-semibold">{t('farmer.aiPrice')}</h2>
            <select
              value={selectedCrop}
              onChange={(event) => setSelectedCrop(event.target.value)}
              className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
            >
              {availableCrops.map((crop) => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-primary/10 p-4 mb-4">
            <p className="text-sm text-muted">{t('farmer.recommendedPrice')}: {selectedCrop}</p>
            {loading ? <p className="mt-1 text-sm text-muted">{t('common.loading')}</p> : prediction?.error ? <p className="mt-1 text-sm text-danger">{prediction.error}</p> : <><p className="text-3xl font-bold mt-1">{formatCurrency(prediction?.predictedPrice || 0)} / kg</p><p className="text-sm text-primary mt-1">{t('common.rating')}: {prediction?.confidence}%</p></>}
            {prediction?.source && <p className="mt-2 text-xs text-muted">{t('common.info')}: {prediction.source}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-surface-elevated p-3">
              <p className="text-muted">{t('common.price')}</p>
              <p className="font-semibold">{prediction ? formatCurrency(prediction.currentPrice) : '—'} / kg</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated p-3">
              <p className="text-muted">{t('farmer.marketTrends')}</p>
              <p className="font-semibold">{prediction ? `${prediction.change >= 0 ? '+' : ''}${prediction.change}%` : '—'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4">{t('farmer.marketTrends')}</h2>
          <div className="h-72 flex items-end justify-between gap-2 overflow-x-auto pb-1">
            {(prediction?.history || []).map((point) => (
              <div key={point.month} className="flex min-w-[36px] flex-1 flex-col items-center gap-2">
                <div className="flex h-52 w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-2xl bg-primary/70"
                    style={{ height: `${Math.max((point.price / maxPrice) * 100, 12)}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted">{point.month}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-4">{t('common.price')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(prediction?.history || []).slice(-3).map((point) => (
            <div key={point.month} className="rounded-2xl bg-surface-elevated p-3">
              <p className="text-sm text-muted">{point.month}</p>
              <p className="text-lg font-semibold">{formatCurrency(point.price)} / kg</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
