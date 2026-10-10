import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import EmptyState from '../ui/EmptyState';
import { INCOME_COLOR, compactRupees } from './IncomeExpenseChart';

const GRID = '#e1e0d9';
const MUTED = '#898781';

function BarTooltip({ active, payload, formatValue }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-900">{name}</p>
      <p className="tabular-nums text-slate-700">{formatValue(value)}</p>
    </div>
  );
}

// Horizontal bars for one measure: category totals, or per-event revenue and attendance.
export default function CategoryBreakdownChart({
  data,
  color = INCOME_COLOR,
  label,
  formatValue = formatCurrency,
  formatTick = compactRupees,
  emptyMessage = 'No data for this selection.',
}) {
  if (!data?.length) return <EmptyState title="Nothing to chart" message={emptyMessage} />;

  const height = Math.max(160, data.length * 34 + 30);
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: MUTED, fontSize: 12 }} tickFormatter={formatTick} />
          <YAxis
            type="category"
            dataKey="name"
            width={112}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#52514e', fontSize: 12 }}
          />
          <Tooltip content={<BarTooltip formatValue={formatValue} />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList dataKey="value" position="right" formatter={formatTick} style={{ fill: '#52514e', fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
