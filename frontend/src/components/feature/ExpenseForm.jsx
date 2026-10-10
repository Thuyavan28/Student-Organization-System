import { useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import { expensesApi } from '../../api/expenses.api';
import { eventsApi } from '../../api/events.api';
import { fundraisersApi } from '../../api/fundraisers.api';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { EXPENSE_CATEGORIES, humanize } from '../../utils/constants';
import { toPaise } from '../../utils/formatCurrency';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EMPTY = { category: 'SUPPLIES', amount: '', description: '', linkType: '', linkId: '' };

function validate(values, receipt) {
  const errors = {};
  const amount = toPaise(values.amount);
  if (!amount || amount <= 0) errors.amount = 'Enter an amount greater than zero';
  if (values.description.trim().length < 3) errors.description = 'Describe what you bought';
  if (values.linkType && !values.linkId) errors.linkId = 'Choose which one this expense belongs to';
  if (receipt && !ALLOWED_TYPES.includes(receipt.type)) errors.receipt = 'Upload a JPG, PNG, WEBP or PDF file';
  else if (receipt && receipt.size > MAX_RECEIPT_BYTES) errors.receipt = 'Receipt must be 5 MB or smaller';
  return errors;
}

export default function ExpenseForm({ onSubmitted }) {
  const toast = useToast();
  const [values, setValues] = useState(EMPTY);
  const [receipt, setReceipt] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const events = useFetch(() => eventsApi.list({ pageSize: 100 }), []);
  const fundraisers = useFetch(() => fundraisersApi.list({ pageSize: 100 }), []);

  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values, receipt);
    setErrors(found);
    if (Object.keys(found).length) return;

    const form = new FormData();
    form.append('category', values.category);
    form.append('amount', String(toPaise(values.amount)));
    form.append('description', values.description.trim());
    if (values.linkType === 'event') form.append('eventId', values.linkId);
    if (values.linkType === 'fundraiser') form.append('fundraiserId', values.linkId);
    if (receipt) form.append('receipt', receipt);

    setSaving(true);
    try {
      await expensesApi.create(form);
      toast.success('Expense claim submitted for review');
      setValues(EMPTY);
      setReceipt(null);
      onSubmitted?.();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const linkOptions = values.linkType === 'event' ? events.data : values.linkType === 'fundraiser' ? fundraisers.data : [];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          value={values.category}
          onChange={set('category')}
          options={EXPENSE_CATEGORIES.map((value) => ({ value, label: humanize(value) }))}
          error={errors.category}
        />
        <Input
          label="Amount (Rs)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={values.amount}
          onChange={set('amount')}
          error={errors.amount}
          placeholder="0.00"
        />
      </div>
      <Input
        label="What was it for?"
        as="textarea"
        rows={3}
        value={values.description}
        onChange={set('description')}
        error={errors.description}
        placeholder="Printing posters for the bake sale"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Belongs to (optional)"
          value={values.linkType}
          onChange={(event) => setValues((current) => ({ ...current, linkType: event.target.value, linkId: '' }))}
          placeholder="General club expense"
          options={[
            { value: 'event', label: 'An event' },
            { value: 'fundraiser', label: 'A fundraiser' },
          ]}
        />
        {values.linkType && (
          <Select
            label={values.linkType === 'event' ? 'Event' : 'Fundraiser'}
            value={values.linkId}
            onChange={set('linkId')}
            placeholder="Select"
            options={(linkOptions ?? []).map((item) => ({ value: item.id, label: item.title }))}
            error={errors.linkId}
          />
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="receipt-file">
          Receipt (optional)
        </label>
        <label
          htmlFor="receipt-file"
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:border-primary-400"
        >
          <FiUploadCloud className="h-5 w-5 text-primary-600" aria-hidden="true" />
          {receipt ? receipt.name : 'Choose a JPG, PNG, WEBP or PDF up to 5 MB'}
        </label>
        <input
          id="receipt-file"
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
        />
        {errors.receipt && <p className="mt-1 text-xs text-red-600">{errors.receipt}</p>}
      </div>
      <Button type="submit" loading={saving}>
        Submit claim
      </Button>
    </form>
  );
}
