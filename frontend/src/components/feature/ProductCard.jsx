import { useState } from 'react';
import { LuMinus, LuPlus, LuShoppingCart, LuBadgePercent, LuTag } from 'react-icons/lu';
import { LOW_STOCK_THRESHOLD } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SizeSelector from './SizeSelector';

const MAX_QUANTITY = 10;

const FALLBACK_IMAGES = {
  hoodie: '/images/products/skyline-hoodie.jpg',
  shirt: '/images/products/skyline-tshirt.jpg',
  tshirt: '/images/products/skyline-tshirt.jpg',
  tee: '/images/products/skyline-tshirt.jpg',
  cap: '/images/products/skyline-cap.jpg',
  hat: '/images/products/skyline-cap.jpg',
  tote: '/images/products/canvas-tote.jpg',
  bag: '/images/products/canvas-tote.jpg',
};

function resolveProductImage(product) {
  if (product.imageUrl) return product.imageUrl;
  const name = product.name?.toLowerCase() || '';
  for (const [key, path] of Object.entries(FALLBACK_IMAGES)) {
    if (name.includes(key)) return path;
  }
  return '/images/products/skyline-hoodie.jpg';
}

export default function ProductCard({ product, onAdd }) {
  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);

  const variant = product.variants?.find((item) => item.id === variantId);
  const totalStock = product.variants?.reduce((sum, item) => sum + item.stock, 0) ?? 0;
  const price = product.yourPrice ?? product.basePrice;
  const discounted = price < product.basePrice;
  const limit = variant ? Math.min(variant.stock, MAX_QUANTITY) : MAX_QUANTITY;

  const imgSrc = imageError ? '/images/products/skyline-hoodie.jpg' : resolveProductImage(product);

  const add = () => {
    onAdd(product, variant, quantity);
    setQuantity(1);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300">
      {/* Product Image Showcase */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={product.name}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Floating Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {totalStock === 0 ? (
            <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
              Sold out
            </span>
          ) : discounted ? (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
              <LuBadgePercent className="h-3 w-3" /> {product.merchDiscountPercent}% Member Deal
            </span>
          ) : (
            <span className="rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Official Merch
            </span>
          )}
        </div>

        {/* Soft Bottom Gradient for Text Legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Product Content */}
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
              {product.name}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Pricing Display */}
        <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
          <span className="text-xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(price)}
          </span>
          {discounted && (
            <span className="text-xs font-semibold text-slate-400 line-through tabular-nums">
              {formatCurrency(product.basePrice)}
            </span>
          )}
          {discounted && (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
              Save {formatCurrency(product.basePrice - price)}
            </span>
          )}
        </div>

        {!discounted && (
          <p className="text-[11px] text-slate-400 -mt-2">
            Members receive special tier discount automatically at checkout.
          </p>
        )}

        {/* Size Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Select Size
          </label>
          <SizeSelector
            variants={product.variants}
            value={variantId}
            onChange={(id) => {
              setVariantId(id);
              setQuantity(1);
            }}
          />
        </div>

        {/* Low Stock Warning */}
        {variant && variant.stock <= LOW_STOCK_THRESHOLD && variant.stock > 0 && (
          <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
            <LuTag className="h-3 w-3" />
            Hurry, only {variant.stock} left in size {variant.size}!
          </p>
        )}

        {/* Quantity Stepper & Add to Cart Action */}
        <div className="mt-auto flex items-center gap-2.5 pt-3 border-t border-slate-100">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-colors"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <LuMinus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-800 tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-colors"
              onClick={() => setQuantity((q) => Math.min(limit, q + 1))}
              disabled={!variant || quantity >= limit}
              aria-label="Increase quantity"
            >
              <LuPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            className="flex-1 py-2 text-xs font-bold shadow-md"
            icon={LuShoppingCart}
            disabled={!variant || totalStock === 0}
            onClick={add}
          >
            {totalStock === 0 ? 'Out of stock' : variant ? 'Add to cart' : 'Pick a size'}
          </Button>
        </div>
      </div>
    </article>
  );
}
