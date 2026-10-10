const dateFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' });

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '-';
}

export function formatTime(value) {
  return value ? timeFormat.format(new Date(value)) : '-';
}

export function formatDateTime(value) {
  return value ? `${formatDate(value)}, ${formatTime(value)}` : '-';
}

export function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return monthFormat.format(new Date(year, month - 1, 1));
}

export function daysUntil(value) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / MS_PER_DAY);
}

export function isPast(value) {
  return value ? new Date(value).getTime() < Date.now() : false;
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}
