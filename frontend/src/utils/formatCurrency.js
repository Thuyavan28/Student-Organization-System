const rupeeFormat = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(paise) {
  const value = Number(paise ?? 0) / 100;
  const sign = value < 0 ? '-' : '';
  return `${sign}Rs ${rupeeFormat.format(Math.abs(value))}`;
}

export function toPaise(rupees) {
  const parsed = Number.parseFloat(String(rupees).replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function toRupeesInput(paise) {
  return paise == null ? '' : String(Number(paise) / 100);
}
