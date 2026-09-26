import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/context/AppContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/cn'

export default function ConsumerWishlistPage() {
  const navigate = useNavigate()
  const { wishlist, addItem } = useCart()

  const handleCheckoutAll = () => {
    wishlist.forEach((product) => addItem(product, 1))
    navigate('/consumer/cart')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/consumer/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground hover:bg-surface-hover"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-medium text-primary">Saved favourites</p>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Wishlist</h1>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{wishlist.length}</span>
      </div>

      {wishlist.length === 0 ? (
        <Card className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No liked products</h2>
          <p className="mt-2 text-sm text-muted">Your wishlist is empty. Explore products and save the ones you like.</p>
          <Button className="mt-5" onClick={() => navigate('/consumer/home')}>
            <ShoppingCart className="h-4 w-4" />
            Continue shopping
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {wishlist.map((product) => (
              <Card key={product.id} className="p-0 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <img src={product.image} alt={product.name} className="h-20 w-20 rounded-2xl object-cover bg-surface-elevated" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted">{product.farmerName}</p>
                    <p className="mt-2 font-bold text-primary">{formatCurrency(product.price)}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => addItem(product, 1)}>
                    Add to cart
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Button size="lg" className="w-full" onClick={handleCheckoutAll}>
            Add all to cart
          </Button>
        </>
      )}
    </div>
  )
}
