import { useState } from 'react';
import { LuPencil, LuPackage, LuPlus, LuSave } from 'react-icons/lu';
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
  const changed = Number(value) !== variant.stock;
  const invalid = value === '' || !Number.isInteger(Number(value)) || Number(value) < 0;

  const save = async () => {
    setSaving(true);
    try {
      await productsApi.updateStock(product.id, variant.id, Number(value));
      toast.success(`${product.name} ${variant.size}: stock set to ${value}`);
      onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="py-2 pr-3 font-medium">{variant.size === 'ONE_SIZE' ? 'One size' : variant.size}</td>
      <td className="py-2 pr-3 font-mono text-xs text-slate-500">{variant.sku}</td>
      <td className="py-2 pr-3">
        {variant.stock === 0 ? <Badge tone="red">Out of stock</Badge> : variant.stock <= LOW_STOCK_THRESHOLD ? <Badge tone="amber">Low</Badge> : <Badge tone="green">OK</Badge>}
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            aria-label={`Stock for ${product.name} ${variant.size}`}
            className="input-base !w-24 !py-1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button size="sm" variant="secondary" icon={LuSave} disabled={!changed || invalid} loading={saving} onClick={save}>Save</Button>
        </div>
      </td>
    </tr>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    basePrice: product ? toRupeesInput(product.basePrice) : '',
    isActive: product?.isActive ?? true,
  });
  const [sizes, setSizes] = useState({ S: true, M: true, L: true, XL: true, XXL: false, ONE_SIZE: false });
  const [initialStock, setInitialStock] = useState('25');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter a product name';
    if (form.basePrice === '' || toPaise(form.basePrice) < 0) found.basePrice = 'Enter a price';
    const chosen = SIZE_ORDER.filter((size) => sizes[size]);
    if (!editing && chosen.length === 0) found.sizes = 'Choose at least one size';
    if (!editing && (!Number.isInteger(Number(initialStock)) || Number(initialStock) < 0)) found.initialStock = 'Stock must be 0 or more';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: toPaise(form.basePrice),
      };
      if (editing) await productsApi.update(product.id, { ...payload, isActive: form.isActive });
      else await productsApi.create({ ...payload, variants: chosen.map((size) => ({ size, stock: Number(initialStock) })) });
      toast.success(editing ? 'Product updated' : 'Product created');
      onSaved();
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
      title={editing ? `Edit ${product.name}` : 'New product'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="product-form" loading={saving}>{editing ? 'Save changes' : 'Create product'}</Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} error={errors.description} />
        <Input label="Base price (Rs)" type="number" min="0" step="0.01" value={form.basePrice} onChange={set('basePrice')} error={errors.basePrice} />
        {editing ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Visible in the shop
          </label>
        ) : (
          <>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">Sizes</legend>
              <div className="flex flex-wrap gap-3">
                {SIZE_ORDER.map((size) => (
                  <label key={size} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="checkbox" checked={sizes[size]} onChange={(event) => setSizes((current) => ({ ...current, [size]: event.target.checked }))} />
                    {size === 'ONE_SIZE' ? 'One size' : size}
                  </label>
                ))}
              </div>
              {errors.sizes && <p className="mt-1 text-xs text-red-600">{errors.sizes}</p>}
            </fieldset>
            <Input label="Starting stock per size" type="number" min="0" value={initialStock} onChange={(event) => setInitialStock(event.target.value)} error={errors.initialStock} />
          </>
        )}
      </form>
    </Modal>
  );
}

export default function Merchandise() {
  const [formState, setFormState] = useState(null);
  const { data, loading, error, reload } = useFetch(() => productsApi.list({ includeInactive: true }), []);

  return (
    <>
      <PageHeader
        title="Merchandise"
        subtitle="Products, sizes and stock. Stock drops automatically when an order is placed."
        actions={<Button icon={LuPlus} onClick={() => setFormState({ product: null })}>New product</Button>}
      />
      {loading && <SkeletonCards count={3} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState
          icon={LuPackage}
          title="No products yet"
          message="Add a hoodie or T-shirt to start taking orders."
          action={<Button icon={LuPlus} onClick={() => setFormState({ product: null })}>New product</Button>}
        />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {data?.map((product) => {
          const total = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
          return (
            <Card
              key={product.id}
              title={product.name}
              subtitle={`${formatCurrency(product.basePrice)} base price - ${total} in stock`}
              actions={
                <>
                  {product.isActive === false && <Badge tone="gray">Hidden</Badge>}
                  <Button size="sm" variant="ghost" icon={LuPencil} onClick={() => setFormState({ product })} aria-label={`Edit ${product.name}`} />
                </>
              }
            >
              <table className="w-full text-sm">
                <caption className="sr-only">{`Stock by size for ${product.name}`}</caption>
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500">
                    <th className="pb-2 pr-3">Size</th><th className="pb-2 pr-3">SKU</th><th className="pb-2 pr-3">Level</th><th className="pb-2">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortVariants(product.variants).map((variant) => (
                    <StockRow key={`${variant.id}-${variant.stock}`} product={product} variant={variant} onSaved={reload} />
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>
      {formState && (
        <ProductForm product={formState.product} onClose={() => setFormState(null)} onSaved={() => { setFormState(null); reload(); }} />
      )}
    </>
  );
}
