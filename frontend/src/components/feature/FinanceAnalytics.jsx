import { useMemo, useState } from 'react';
import {
  LuChartColumn,
  LuDownload,
  LuFileSpreadsheet,
  LuLightbulb,
  LuPercent,
  LuPrinter,
  LuTable,
  LuTrendingDown,
  LuTrendingUp,
  LuWallet,
} from 'react-icons/lu';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { transactionsApi } from '../../api/transactions.api';
import { useFinanceSummary } from '../../hooks/queries/finance.queries';
import { useToast } from '../../context/ToastContext';
import { humanize } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMonth } from '../../utils/formatDate';
import Button from '../ui/Button';
import DataCard, { DataCardBody } from '../ui/DataCard';
import Select from '../ui/Select';
import StatCard from '../ui/StatCard';

// Validated categorical slots 1 and 2 (distinct for colour-blind readers); text always uses ink tokens.
const INCOME = '#2a78d6';
const EXPENSE = '#eb6834';
const INK = '#09090b';
const MUTED = '#52525b';
const GRID = '#e4e4e7';
const MAX_BAR = 24;

const PERIODS = [
  { id: '3m', label: 'Last 3 months' },
  { id: '6m', label: 'Last 6 months' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'ytd', label: 'This year' },
  { id: 'all', label: 'All time' },
];

function rangeFor(period) {
  const now = new Date();
  const monthsBack = { '3m': 2, '6m': 5, '12m': 11 }[period];
  if (monthsBack != null) return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)).toISOString() };
  if (period === 'ytd') return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString() };
  return {};
}

const rupeesShort = (paise) => {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';
  if (rupees >= 100000) return `${sign}${(rupees / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (rupees >= 1000) return `${sign}${(rupees / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${sign}${Math.round(rupees)}`;
};

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cf-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-cf-fg">{label ?? payload[0].payload.name}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-cf-fg">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color ?? entry.payload.fill }} aria-hidden="true" />
          {entry.name}: <span className="font-semibold tabular-nums">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ items }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-4 text-xs text-cf-fg">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" /> {item.label}
        </li>
      ))}
    </ul>
  );
}

// Card with a chart/table switch so every chart also has an accessible table view.
function ChartCard({ title, subtitle, legend, table, empty, className = '', children }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <DataCard
      title={title}
      subtitle={subtitle}
      className={`break-inside-avoid ${className}`}
      action={
        !empty && table ? (
          <Button size="sm" variant="ghost" icon={showTable ? LuChartColumn : LuTable} onClick={() => setShowTable((v) => !v)} className="no-print">
            {showTable ? 'Chart' : 'Table'}
          </Button>
        ) : null
      }
    >
      <DataCardBody>
        {empty ? (
          <p className="py-10 text-center text-sm text-cf-muted">No data for this period.</p>
        ) : showTable && table ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cf-fg/80 text-left text-xs font-semibold text-cf-fg">
                  {table.columns.map((c) => <th key={c.key} className={`py-2 pr-4 ${c.right ? 'text-right' : ''}`}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-cf-divider">
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {table.columns.map((c) => (
                      <td key={c.key} className={`py-2 pr-4 tabular-nums ${c.right ? 'text-right' : ''}`}>{c.render ? c.render(row) : row[c.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {legend && <Legend items={legend} />}
            {children}
          </>
        )}
      </DataCardBody>
    </DataCard>
  );
}

const axisProps = { tickLine: false, axisLine: false, tick: { fill: MUTED, fontSize: 12 } };

function HorizontalBars({ data, color, label }) {
  const height = Math.max(180, data.length * 38 + 20);
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 84, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={120} {...axisProps} tick={{ fill: INK, fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(9,9,11,0.04)' }} />
          <Bar dataKey="value" name="Amount" maxBarSize={MAX_BAR} radius={[0, 4, 4, 0]} fill={color}>
            {data.map((d) => <Cell key={d.name} fill={d.fill ?? color} />)}
            <LabelList dataKey="value" position="right" formatter={(v) => `Rs ${rupeesShort(v)}`} fill={MUTED} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(content, filename, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceAnalytics() {
  const toast = useToast();
  const [period, setPeriod] = useState('6m');
  const [exporting, setExporting] = useState('');
  const range = useMemo(() => rangeFor(period), [period]);
  const { data, isLoading, isError } = useFinanceSummary(range);
  const summary = data?.data;
  const periodLabel = PERIODS.find((p) => p.id === period).label;

  const view = useMemo(() => {
    if (!summary) return null;
    let running = 0;
    const months = summary.byMonth.map((m) => {
      const net = m.income - m.expense;
      running += net;
      return { ...m, net, cumulative: running, label: formatMonth(m.month) };
    });
    const cats = (type) => summary.byCategory
      .filter((c) => c.type === type)
      .map((c) => ({ name: humanize(c.category), value: c.amount }))
      .sort((a, b) => b.value - a.value);
    const events = [...summary.byEvent]
      .sort((a, b) => b.net - a.net)
      .map((e) => ({ name: e.title, value: e.net, income: e.income, expense: e.expense, fill: e.net >= 0 ? INCOME : EXPENSE }));
    const fundraisers = summary.byFundraiser.map((f) => ({ name: f.title, income: f.income, expense: f.expense }));
    return { months, incomeCats: cats('INCOME'), expenseCats: cats('EXPENSE'), events, fundraisers };
  }, [summary]);

  const insights = useMemo(() => {
    if (!summary || !view) return [];
    const out = [];
    const { income, expense, net } = summary;
    if (income || expense) {
      out.push(`In ${periodLabel.toLowerCase()} the club earned ${formatCurrency(income)} and spent ${formatCurrency(expense)}, leaving a ${net >= 0 ? 'surplus' : 'deficit'} of ${formatCurrency(Math.abs(net))}.`);
    }
    if (view.incomeCats[0]) out.push(`${view.incomeCats[0].name} is the biggest income source at ${percent(view.incomeCats[0].value, income)}% of all income.`);
    if (view.expenseCats[0]) out.push(`${view.expenseCats[0].name} is the largest expense at ${percent(view.expenseCats[0].value, expense)}% of all spending.`);
    const withActivity = view.months.filter((m) => m.income || m.expense);
    if (withActivity.length > 1) {
      const best = withActivity.reduce((a, b) => (b.net > a.net ? b : a));
      const worst = withActivity.reduce((a, b) => (b.net < a.net ? b : a));
      out.push(`Best month: ${best.label} (${formatCurrency(best.net)}). Weakest month: ${worst.label} (${formatCurrency(worst.net)}).`);
    }
    if (view.events.length) {
      const top = view.events[0];
      const bottom = view.events[view.events.length - 1];
      out.push(`Top event: ${top.name} (${formatCurrency(top.value)}).${bottom.value < 0 ? ` ${bottom.name} lost ${formatCurrency(Math.abs(bottom.value))}.` : ''}`);
    }
    return out;
  }, [summary, view, periodLabel]);

  const activeMonths = view?.months.filter((m) => m.income || m.expense).length || 0;
  const avgNet = activeMonths ? Math.round((summary?.net ?? 0) / activeMonths) : 0;
  const savings = percent(summary?.net ?? 0, summary?.income ?? 0);

  const run = async (key, task) => {
    setExporting(key);
    try {
      await task();
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting('');
    }
  };

  const exportLedger = () => run('ledger', async () => {
    const res = await transactionsApi.exportCsv(range);
    download(new Blob([res], { type: 'text/csv' }), `ledger-${period}-${Date.now()}.csv`);
  });

  const exportSummary = () => run('summary', async () => {
    const lines = [];
    const section = (title, header, rows) => {
      lines.push(csvCell(title), header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(',')), '');
    };
    const rs = (paise) => (paise / 100).toFixed(2);
    section(`ClubFlow finance report - ${periodLabel}`, ['Metric', 'Amount (Rs)'], [
      ['Total income', rs(summary.income)], ['Total expense', rs(summary.expense)], ['Net balance', rs(summary.net)], ['Savings rate %', savings],
    ]);
    section('By month', ['Month', 'Income (Rs)', 'Expense (Rs)', 'Net (Rs)'], view.months.map((m) => [m.month, rs(m.income), rs(m.expense), rs(m.net)]));
    section('Income by category', ['Category', 'Amount (Rs)'], view.incomeCats.map((c) => [c.name, rs(c.value)]));
    section('Expense by category', ['Category', 'Amount (Rs)'], view.expenseCats.map((c) => [c.name, rs(c.value)]));
    section('By event', ['Event', 'Income (Rs)', 'Expense (Rs)', 'Net (Rs)'], view.events.map((e) => [e.name, rs(e.income), rs(e.expense), rs(e.value)]));
    section('By fundraiser', ['Fundraiser', 'Raised (Rs)', 'Spent (Rs)'], view.fundraisers.map((f) => [f.name, rs(f.income), rs(f.expense)]));
    download(`﻿${lines.join('\r\n')}`, `finance-report-${period}-${Date.now()}.csv`);
  });

  return (
    <div className="space-y-6">
      {/* Only visible when printing or saving as PDF */}
      <div className="hidden print:block">
        <h2 className="text-2xl font-bold">ClubFlow finance report</h2>
        <p className="text-sm text-cf-muted">{periodLabel} - generated {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      </div>

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-cf-muted">Trends, breakdowns and event results for the club. Pick a period; every chart and export below follows it.</p>
        <div className="w-48">
          <Select id="report-period" label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} options={PERIODS.map((p) => ({ value: p.id, label: p.label }))} />
        </div>
      </div>

      {isError ? (
        <p className="rounded-2xl border border-cf-border p-6 text-sm text-cf-fg">Could not load the report. Please refresh and try again.</p>
      ) : isLoading || !summary || !view ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Income" value={formatCurrency(summary.income)} sub={periodLabel} icon={LuTrendingUp} />
            <StatCard label="Expense" value={formatCurrency(summary.expense)} sub={periodLabel} icon={LuTrendingDown} />
            <StatCard label="Net balance" value={formatCurrency(summary.net)} sub={`${formatCurrency(avgNet)} per active month`} icon={LuWallet} />
            <StatCard label="Savings rate" value={`${savings}%`} sub="Net as a share of income" icon={LuPercent} />
          </div>

          {insights.length > 0 && (
            <DataCard title="Key insights" action={<LuLightbulb className="h-5 w-5" aria-hidden="true" />} className="break-inside-avoid">
              <DataCardBody>
                <ul className="space-y-2 text-sm text-cf-fg">
                  {insights.map((line) => (
                    <li key={line} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cf-fg" aria-hidden="true" />{line}</li>
                  ))}
                </ul>
              </DataCardBody>
            </DataCard>
          )}

          <ChartCard
            title="Income vs expense by month"
            subtitle="How much came in and went out each month"
            legend={[{ label: 'Income', color: INCOME }, { label: 'Expense', color: EXPENSE }]}
            empty={!activeMonths}
            table={{
              columns: [
                { key: 'label', label: 'Month' },
                { key: 'income', label: 'Income', right: true, render: (r) => formatCurrency(r.income) },
                { key: 'expense', label: 'Expense', right: true, render: (r) => formatCurrency(r.expense) },
                { key: 'net', label: 'Net', right: true, render: (r) => formatCurrency(r.net) },
              ],
              rows: view.months,
            }}
          >
            <div className="h-72" role="img" aria-label="Monthly income compared with expense">
              <ResponsiveContainer>
                <BarChart data={view.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={44} tickFormatter={rupeesShort} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(9,9,11,0.04)' }} />
                  <Bar dataKey="income" name="Income" fill={INCOME} maxBarSize={MAX_BAR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill={EXPENSE} maxBarSize={MAX_BAR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Net balance over time"
              subtitle="Running total: income minus expense"
              empty={!activeMonths}
              table={{
                columns: [
                  { key: 'label', label: 'Month' },
                  { key: 'net', label: 'Net', right: true, render: (r) => formatCurrency(r.net) },
                  { key: 'cumulative', label: 'Running total', right: true, render: (r) => formatCurrency(r.cumulative) },
                ],
                rows: view.months,
              }}
            >
              <div className="h-64" role="img" aria-label="Running net balance by month">
                <ResponsiveContainer>
                  <AreaChart data={view.months} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} width={44} tickFormatter={rupeesShort} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="cumulative" name="Running net" stroke={INK} strokeWidth={2} fill={INK} fillOpacity={0.08} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Raised vs spent by fundraiser"
              subtitle="Campaign income against campaign costs"
              legend={[{ label: 'Raised', color: INCOME }, { label: 'Spent', color: EXPENSE }]}
              empty={!view.fundraisers.length}
              table={{
                columns: [
                  { key: 'name', label: 'Fundraiser' },
                  { key: 'income', label: 'Raised', right: true, render: (r) => formatCurrency(r.income) },
                  { key: 'expense', label: 'Spent', right: true, render: (r) => formatCurrency(r.expense) },
                ],
                rows: view.fundraisers,
              }}
            >
              <div className="h-64" role="img" aria-label="Raised compared with spent for each fundraiser">
                <ResponsiveContainer>
                  <BarChart data={view.fundraisers} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" {...axisProps} interval={0} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 11)}...` : v)} />
                    <YAxis {...axisProps} width={44} tickFormatter={rupeesShort} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(9,9,11,0.04)' }} />
                    <Bar dataKey="income" name="Raised" fill={INCOME} maxBarSize={MAX_BAR} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Spent" fill={EXPENSE} maxBarSize={MAX_BAR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Income by category"
              subtitle="Where the money comes from"
              empty={!view.incomeCats.length}
              table={{
                columns: [
                  { key: 'name', label: 'Category' },
                  { key: 'value', label: 'Amount', right: true, render: (r) => formatCurrency(r.value) },
                  { key: 'share', label: 'Share', right: true, render: (r) => `${percent(r.value, summary.income)}%` },
                ],
                rows: view.incomeCats,
              }}
            >
              <HorizontalBars data={view.incomeCats} color={INCOME} label="Income by category" />
            </ChartCard>

            <ChartCard
              title="Expense by category"
              subtitle="Where the money goes"
              empty={!view.expenseCats.length}
              table={{
                columns: [
                  { key: 'name', label: 'Category' },
                  { key: 'value', label: 'Amount', right: true, render: (r) => formatCurrency(r.value) },
                  { key: 'share', label: 'Share', right: true, render: (r) => `${percent(r.value, summary.expense)}%` },
                ],
                rows: view.expenseCats,
              }}
            >
              <HorizontalBars data={view.expenseCats} color={EXPENSE} label="Expense by category" />
            </ChartCard>
          </div>

          <ChartCard
            title="Event profit and loss"
            subtitle="Net result of each event: income minus costs"
            legend={[{ label: 'Surplus', color: INCOME }, { label: 'Deficit', color: EXPENSE }]}
            empty={!view.events.length}
            table={{
              columns: [
                { key: 'name', label: 'Event' },
                { key: 'income', label: 'Income', right: true, render: (r) => formatCurrency(r.income) },
                { key: 'expense', label: 'Expense', right: true, render: (r) => formatCurrency(r.expense) },
                { key: 'value', label: 'Net', right: true, render: (r) => formatCurrency(r.value) },
              ],
              rows: view.events,
            }}
          >
            <HorizontalBars data={view.events} color={INCOME} label="Net result by event" />
          </ChartCard>
        </>
      )}

      {/* Export at the end of the screen */}
      <DataCard title="Export and reports" subtitle={`Everything below uses the selected period: ${periodLabel}`} className="no-print">
        <DataCardBody>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { key: 'summary', icon: LuFileSpreadsheet, title: 'Summary report (CSV)', text: 'Totals, months, categories, events and fundraisers in one spreadsheet.', action: exportSummary },
              { key: 'ledger', icon: LuDownload, title: 'Full ledger (CSV)', text: 'Every transaction in the period, ready for your accountant.', action: exportLedger },
              { key: 'print', icon: LuPrinter, title: 'Print or save as PDF', text: 'A clean copy of this page with the charts. Choose "Save as PDF" in the print dialog.', action: () => window.print() },
            ].map((item) => (
              <div key={item.key} className="flex flex-col justify-between rounded-2xl border border-cf-border p-5">
                <div>
                  <item.icon className="mb-3 h-6 w-6" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-cf-fg">{item.title}</h3>
                  <p className="mt-1 text-sm text-cf-muted">{item.text}</p>
                </div>
                <Button className="mt-4" variant="secondary" icon={item.icon} loading={exporting === item.key} disabled={!summary && item.key !== 'ledger'} onClick={item.action}>
                  {item.key === 'print' ? 'Print report' : 'Download'}
                </Button>
              </div>
            ))}
          </div>
        </DataCardBody>
      </DataCard>
    </div>
  );
}
