import { useState } from 'react';
import { LuMinus, LuPlus, LuShoppingCart } from 'react-icons/lu';
import { LOW_STOCK_THRESHOLD } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SizeSelector from './SizeSelector';

const MAX_QUANTITY = 10;

export default function ProductCard({ product, onAdd }) {
  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants.find((item) => item.id === variantId);
  const totalStock = product.variants.reduce((sum, item) => sum + item.stock, 0);
  const price = product.yourPrice ?? product.basePrice;
  const discounted = price < product.basePrice;
  const limit = variant ? Math.min(variant.stock, MAX_QUANTITY) : MAX_QUANTITY;

  const add = () => {
    onAdd(product, variant, quantity);
    setQuantity(1);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600">
        <LuShoppingCart className="h-10 w-10" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{product.name}</h3>
            {totalStock === 0 && <Badge tone="red">Sold out</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-600">{product.description}</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-slate-900">{formatCurrency(price)}</span>
          {discounted && <span className="text-sm text-slate-400 line-through">{formatCurrency(product.basePrice)}</span>}
          {discounted && <Badge tone="blue">{product.merchDiscountPercent}% member discount</Badge>}
        </div>
        {!discounted && (
          <p className="text-xs text-slate-500">Members get a tier discount automatically at checkout.</p>
        )}

        <SizeSelector variants={product.variants} value={variantId} onChange={(id) => { setVariantId(id); setQuantity(1); }} />
        {variant && variant.stock <= LOW_STOCK_THRESHOLD && (
          <p className="text-xs font-medium text-amber-700">Only {variant.stock} left in this size</p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-2">
          <div className="flex items-center rounded-lg border border-slate-300">
            <button
              type="button"
              className="p-2 text-slate-600 disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <LuMinus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
            <button
              type="button"
              className="p-2 text-slate-600 disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.min(limit, q + 1))}
              disabled={!variant || quantity >= limit}
              aria-label="Increase quantity"
            >
              <LuPlus className="h-4 w-4" />
            </button>
          </div>
          <Button className="flex-1" icon={LuShoppingCart} disabled={!variant} onClick={add}>
            {variant ? 'Add to cart' : 'Pick a size'}
          </Button>
        </div>
      </div>
    </article>
  );
}
