import { LOW_STOCK_THRESHOLD, SIZE_ORDER, humanize } from '../../utils/constants';

export function sortVariants(variants) {
  return [...variants].sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
}

export default function SizeSelector({ variants, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Size" className="flex flex-wrap gap-2">
      {sortVariants(variants).map((variant) => {
        const soldOut = variant.stock <= 0;
        const selected = value === variant.id;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={soldOut}
            onClick={() => onChange(variant.id)}
            className={`min-w-[3rem] rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              selected
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-primary-400'
            } ${soldOut ? 'cursor-not-allowed line-through opacity-40' : ''}`}
            title={soldOut ? 'Out of stock' : variant.stock <= LOW_STOCK_THRESHOLD ? `Only ${variant.stock} left` : undefined}
          >
            {variant.size === 'ONE_SIZE' ? humanize(variant.size) : variant.size}
          </button>
        );
      })}
    </div>
  );
}
