import { useState, useMemo } from 'react';
import {
  LuPencil,
  LuPackage,
  LuPlus,
  LuMinus,
  LuTriangleAlert,
  LuBoxes,
  LuSearch,
  LuCheck,
  LuTag,
  LuCircleAlert,
  LuCircleCheck,
  LuShirt,
} from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { productsApi } from '../../api/products.api';
import { sortVariants } from '../../components/feature/SizeSelector';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { LOW_STOCK_THRESHOLD, SIZE_ORDER } from '../../utils/constants';
import { formatCurrency, toPaise, toRupeesInput } from '../../utils/formatCurrency';

function StockRow({ product, variant, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(String(variant.stock));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const currentNum = Number(value);
  const changed = currentNum !== variant.stock;
  const invalid = value === '' || !Number.isInteger(currentNum) || currentNum < 0;

  const adjustStock = (delta) => {
    const next = Math.max(0, (Number(value) || 0) + delta);
    setValue(String(next));
  };

  const save = async () => {
    if (invalid || !changed) return;
    setSaving(true);
    try {
      await productsApi.updateStock(product.id, variant.id, Number(value));
      toast.success(`${product.name} (${variant.size}): Stock updated to ${value}`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const isOutOfStock = variant.stock === 0;
  const isLowStock = !isOutOfStock && variant.stock <= LOW_STOCK_THRESHOLD;

  return (
    <tr className="border-b border-cf-divider transition-colors hover:bg-cf-subtle">
      {/* Size Pill */}
      <td className="py-3 px-4">
        <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-lg bg-cf-subtle px-2.5 py-1 text-xs font-bold text-cf-fg">
          {variant.size === 'ONE_SIZE' ? 'One size' : variant.size}
        </span>
      </td>

      {/* SKU Tag */}
      <td className="py-3 px-4">
        <span className="font-mono text-xs text-cf-muted font-medium">{variant.sku}</span>
      </td>

      {/* Stock Health Level */}
      <td className="py-3 px-4">
        {isOutOfStock ? (
          <Badge tone="red">Out of stock</Badge>
        ) : isLowStock ? (
          <Badge tone="amber">Low stock ({variant.stock})</Badge>
        ) : (
          <Badge tone="green">In stock</Badge>
        )}
      </td>

      {/* Interactive Stock Stepper & Inline Save */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Stepper Box */}
          <div className="inline-flex items-center rounded-lg border border-cf-divider bg-white p-0.5 ">
            <button
              type="button"
              onClick={() => adjustStock(-1)}
              disabled={currentNum <= 0}
              className="flex h-7 w-7 items-center justify-center rounded-md text-cf-muted hover:bg-cf-subtle hover:text-cf-fg disabled:opacity-40 transition-colors"
              title="Decrease stock"
            >
              <LuMinus className="h-3 w-3" />
            </button>

            <input
              type="number"
              min="0"
              aria-label={`Stock for ${product.name} ${variant.size}`}
              className="w-14 border-0 bg-transparent py-1 text-center font-mono text-sm font-semibold text-cf-fg focus:outline-none focus:ring-0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && changed && !invalid) {
                  e.preventDefault();
                  save();
                }
              }}
            />

            <button
              type="button"
              onClick={() => adjustStock(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-cf-muted hover:bg-cf-subtle hover:text-cf-fg transition-colors"
              title="Increase stock"
            >
              <LuPlus className="h-3 w-3" />
            </button>
          </div>

          {/* Quick Save Trigger */}
          {changed && !invalid && (
            <Button
              size="sm"
              variant="primary"
              onClick={save}
              loading={saving}
              className="px-2.5 py-1 text-xs"
            >
              Save
            </Button>
          )}

          {justSaved && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 animate-pulse">
              <LuCheck className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(product);
  const [form, setForm] = useState(
    product
      ? {
          name: product.name,
          description: product.description ?? '',
          basePrice: toRupeesInput(product.basePrice),
          isActive: product.isActive ?? true,
        }
      : {
          name: '',
          description: '',
          basePrice: '',
        },
  );
  const [sizes, setSizes] = useState(() =>
    SIZE_ORDER.reduce((acc, s) => ({ ...acc, [s]: ['S', 'M', 'L', 'XL'].includes(s) }), {}),
  );
  const [initialStock, setInitialStock] = useState('20');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((curr) => ({ ...curr, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter a product title';
    const parsedPrice = toPaise(form.basePrice);
    if (parsedPrice < 0 || form.basePrice === '') found.basePrice = 'Enter a valid price';

    let selectedSizes = [];
    if (!editing) {
      selectedSizes = Object.entries(sizes)
        .filter(([, checked]) => checked)
        .map(([size]) => size);
      if (selectedSizes.length === 0) found.sizes = 'Select at least one size variant';
      const numStock = Number(initialStock);
      if (!Number.isInteger(numStock) || numStock < 0) found.initialStock = 'Enter a non-negative stock';
    }

    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      if (editing) {
        await productsApi.update(product.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          basePrice: parsedPrice,
          isActive: form.isActive,
        });
        toast.success('Product details updated');
      } else {
        await productsApi.create({
          name: form.name.trim(),
          description: form.description.trim(),
          basePrice: parsedPrice,
          sizes: selectedSizes,
          initialStock: Number(initialStock),
        });
        toast.success('New merchandise created');
      }
      onSaved();
      onClose();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={editing ? `Edit ${product.name}` : 'New Merchandise Product'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            {editing ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Product Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input
          label="Description"
          as="textarea"
          rows={3}
          value={form.description}
          onChange={set('description')}
          error={errors.description}
        />
        <Input
          label="Base Price (Rs)"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 599.00"
          value={form.basePrice}
          onChange={set('basePrice')}
          error={errors.basePrice}
        />

        {editing ? (
          <label className="flex items-center gap-3 rounded-xl border border-cf-divider p-3 text-sm font-medium text-cf-fg cursor-pointer hover:bg-cf-subtle transition-colors">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-cf-fg"
              checked={form.isActive}
              onChange={(e) => setForm((curr) => ({ ...curr, isActive: e.target.checked }))}
            />
            <span>Active in student merchandise store</span>
          </label>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-cf-muted">Available Size Variants</label>
              <div className="flex flex-wrap gap-2">
                {SIZE_ORDER.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSizes((curr) => ({ ...curr, [size]: !curr[size] }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      sizes[size]
                        ? 'bg-slate-900 text-white '
                        : 'bg-cf-subtle text-cf-muted hover:bg-slate-200'
                    }`}
                  >
                    {size === 'ONE_SIZE' ? 'One size' : size}
                  </button>
                ))}
              </div>
              {errors.sizes && <p className="text-xs text-red-600">{errors.sizes}</p>}
            </div>

            <Input
              label="Starting Stock per Selected Size"
              type="number"
              min="0"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              error={errors.initialStock}
            />
          </>
        )}
      </form>
    </Modal>
  );
}

export default function Merchandise() {
  const [formState, setFormState] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const { data, loading, error, reload } = useFetch(
    () => productsApi.list({ includeInactive: true }),
    [],
  );

  const productsList = Array.isArray(data) ? data : [];

  // Metrics
  const totalProducts = productsList.length;
  const totalStockUnits = productsList.reduce(
    (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.stock, 0),
    0,
  );
  const lowStockVariants = productsList.reduce(
    (sum, p) => sum + p.variants.filter((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD).length,
    0,
  );
  const outOfStockVariants = productsList.reduce(
    (sum, p) => sum + p.variants.filter((v) => v.stock === 0).length,
    0,
  );

  // Filtered list
  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.variants.some((v) => v.sku?.toLowerCase().includes(q));

      const hasOutOfStock = product.variants.some((v) => v.stock === 0);
      const hasLowStock = product.variants.some((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD);
      const totalUnits = product.variants.reduce((sum, v) => sum + v.stock, 0);

      if (filter === 'OUT_OF_STOCK') return matchesSearch && hasOutOfStock;
      if (filter === 'LOW_STOCK') return matchesSearch && hasLowStock;
      if (filter === 'IN_STOCK') return matchesSearch && totalUnits > 0;
      return matchesSearch;
    });
  }, [productsList, search, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchandise & Inventory"
        subtitle="Manage club apparel, accessories, sizes, and real-time inventory levels."
        actions={
          <Button icon={LuPlus} onClick={() => setFormState({ product: null })}>
            New product
          </Button>
        }
      />

      {/* Inventory KPI Highlights */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-cf-fg">Total Products</p>
              <LuPackage className="h-5 w-5 text-cf-muted" />
            </div>
            <p className="mt-2 text-stat-value text-cf-fg tabular-nums">{totalProducts}</p>
            <p className="mt-0.5 text-xs text-cf-muted">Active catalog items</p>
          </div>

          <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-cf-fg">Total Units</p>
              <LuBoxes className="h-5 w-5 text-cf-fg" />
            </div>
            <p className="mt-2 text-stat-value text-cf-fg tabular-nums">{totalStockUnits}</p>
            <p className="mt-0.5 text-xs text-cf-muted">Across all variants</p>
          </div>

          <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-cf-fg">Low Stock</p>
              <LuTriangleAlert className={`h-5 w-5 ${lowStockVariants > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
            </div>
            <p className={`mt-2 text-stat-value tabular-nums ${lowStockVariants > 0 ? 'text-cf-fg' : 'text-cf-fg'}`}>
              {lowStockVariants}
            </p>
            <p className="mt-0.5 text-xs text-cf-muted">Variants need restock</p>
          </div>

          <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-cf-fg">Out of Stock</p>
              <LuCircleAlert className={`h-5 w-5 ${outOfStockVariants > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
            </div>
            <p className={`mt-2 text-stat-value tabular-nums ${outOfStockVariants > 0 ? 'text-cf-fg' : 'text-cf-fg'}`}>
              {outOfStockVariants}
            </p>
            <p className="mt-0.5 text-xs text-cf-muted">Zero inventory</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Products' },
            { id: 'IN_STOCK', label: 'In Stock' },
            { id: 'LOW_STOCK', label: 'Low Stock' },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-slate-900 text-white '
                  : 'bg-cf-subtle text-cf-muted hover:bg-slate-200 hover:text-cf-fg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cf-muted" />
          <input
            type="text"
            placeholder="Search merchandise or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-cf-divider bg-white py-2 pl-9 pr-4 text-xs text-cf-fg placeholder:text-cf-muted focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 "
          />
        </div>
      </div>

      {loading && <SkeletonCards count={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && filteredProducts.length === 0 && (
        <EmptyState
          icon={LuPackage}
          title="No products found"
          message={
            search || filter !== 'ALL'
              ? 'No products match your search or filter. Try resetting filters.'
              : 'Add a hoodie, T-shirt or cap to start managing club merchandise.'
          }
          action={
            search || filter !== 'ALL' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button icon={LuPlus} onClick={() => setFormState({ product: null })}>
                New product
              </Button>
            )
          }
        />
      )}

      {/* Product Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredProducts.map((product) => {
          const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
          const hasLow = product.variants.some((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD);
          const hasOut = product.variants.some((v) => v.stock === 0);

          return (
            <Card
              key={product.id}
              title={
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-11 w-11 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                      <LuShirt className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{product.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatCurrency(product.basePrice)} base price · {totalStock} total units
                    </p>
                  </div>
                </div>
              }
              action={
                <div className="flex items-center gap-2">
                  {product.isActive === false ? (
                    <Badge tone="gray">Hidden</Badge>
                  ) : hasOut ? (
                    <Badge tone="red">Needs Restock</Badge>
                  ) : hasLow ? (
                    <Badge tone="amber">Low Stock</Badge>
                  ) : (
                    <Badge tone="green">In Stock</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={LuPencil}
                    onClick={() => setFormState({ product })}
                    aria-label={`Edit ${product.name}`}
                  >
                    Edit
                  </Button>
                </div>
              }
            >
              {/* Product Variant Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">{`Stock by size for ${product.name}`}</caption>
                  <thead className="bg-cf-subtle border-b border-cf-divider text-[11px] font-semibold text-cf-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortVariants(product.variants).map((variant) => (
                      <StockRow
                        key={`${variant.id}-${variant.stock}`}
                        product={product}
                        variant={variant}
                        onSaved={reload}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card Footer Summary */}
              <div className="flex items-center justify-between border-t border-cf-divider bg-cf-subtle px-4 py-2.5 text-xs text-cf-muted">
                <span className="flex items-center gap-1.5 font-medium">
                  <LuTag className="h-3.5 w-3.5 text-cf-muted" />
                  {product.variants.length} size variants
                </span>
                <span className="font-bold text-cf-fg tabular-nums">Total: {totalStock} in stock</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Product Form Modal */}
      {formState && (
        <ProductForm
          product={formState.product}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
