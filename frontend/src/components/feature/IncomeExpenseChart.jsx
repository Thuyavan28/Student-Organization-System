import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LuChartColumn, LuTable } from 'react-icons/lu';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMonth } from '../../utils/formatDate';
import Button from '../ui/Button';

// Income = green, Expense = red (matches Dashboard and design system)
export const INCOME_COLOR = '#16a34a';
export const EXPENSE_COLOR = '#dc2626';
const GRID = '#e4e4e7';
const AXIS = '#d4d4d8';
const MUTED = '#71717a';


export function compactRupees(paise) {
  const rupees = Math.abs(paise) / 100;
  if (rupees >= 100000) return `${(rupees / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (rupees >= 1000) return `${(rupees / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(rupees));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-slate-700">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden="true" />
          {entry.name}: <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function IncomeExpenseChart({ data }) {
  const [showTable, setShowTable] = useState(false);
  const rows = (data ?? []).map((row) => ({ ...row, label: formatMonth(row.month) }));

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          icon={showTable ? LuChartColumn : LuTable}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? 'Show chart' : 'View as table'}
        </Button>
      </div>
      {showTable ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <caption className="sr-only">Monthly income and expense</caption>
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4 text-right">Income</th>
                <th className="py-2 text-right">Expense</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.month}>
                  <td className="py-2 pr-4">{row.label}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(row.income)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(row.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full" role="img" aria-label="Monthly income compared with expense">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS }} tick={{ fill: MUTED, fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: MUTED, fontSize: 12 }}
                tickFormatter={compactRupees}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: '#52514e' }} />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
