import {
  FiUsers, FiCalendar, FiCheckSquare, FiBell, FiShoppingBag, FiPackage, FiHeart,
  FiDollarSign, FiFileText, FiAward, FiSettings, FiUser, FiTag, FiClipboard, FiGrid,
} from 'react-icons/fi';

export const ROLES = {
  ADMIN: 'ADMIN',
  TREASURER: 'TREASURER',
  VOLUNTEER: 'VOLUNTEER',
  MEMBER: 'MEMBER',
};

export const STAFF_ROLES = [ROLES.ADMIN, ROLES.TREASURER, ROLES.VOLUNTEER];

export const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export const STATUS_TONE = {
  ACTIVE: 'green',
  PAID: 'green',
  VALID: 'green',
  CONFIRMED: 'green',
  PUBLISHED: 'green',
  FULFILLED: 'green',
  COMPLETED: 'green',
  REIMBURSED: 'green',
  INCOME: 'green',
  APPROVED: 'blue',
  IN_PROGRESS: 'blue',
  PLACED: 'blue',
  PENDING: 'amber',
  SUBMITTED: 'amber',
  PLANNING: 'amber',
  DRAFT: 'gray',
  USED: 'gray',
  EXPIRED: 'red',
  CANCELLED: 'red',
  REJECTED: 'red',
  REFUNDED: 'red',
  EXPENSE: 'red',
};

export function homeFor(role) {
  if (role === ROLES.ADMIN || role === ROLES.TREASURER) return '/admin';
  if (role === ROLES.VOLUNTEER) return '/admin/check-in';
  return '/me';
}

export const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'];
export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'];
export const EXPENSE_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'];
export const ORDER_STATUSES = ['PLACED', 'PAID', 'FULFILLED', 'CANCELLED'];
export const FUNDRAISER_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
export const TXN_TYPES = ['INCOME', 'EXPENSE'];
export const TXN_CATEGORIES = [
  'DUES', 'TICKETS', 'MERCHANDISE', 'FUNDRAISER', 'DONATION', 'VENUE', 'FOOD',
  'SUPPLIES', 'MARKETING', 'REIMBURSEMENT', 'OTHER',
];
export const EXPENSE_CATEGORIES = ['VENUE', 'FOOD', 'SUPPLIES', 'MARKETING', 'OTHER'];
export const LEADERSHIP_POSITIONS = [
  'PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'EVENT_LEAD', 'OTHER',
];
export const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'];
export const LOW_STOCK_THRESHOLD = 5;

export const PAYMENT_DISCLAIMER = 'Demo payment: no real money is charged';

export function humanize(value) {
  if (!value) return '';
  const text = String(value).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const MEMBER_NAV = [
  { to: '/me', label: 'My profile', icon: FiUser, end: true },
  { to: '/me/tickets', label: 'My tickets', icon: FiTag },
  { to: '/me/orders', label: 'My orders', icon: FiShoppingBag },
  { to: '/events', label: 'Events', icon: FiCalendar },
  { to: '/shop', label: 'Shop', icon: FiPackage },
  { to: '/announcements', label: 'Announcements', icon: FiBell },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/members', label: 'Members', icon: FiUsers, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/events', label: 'Events', icon: FiCalendar, roles: [ROLES.ADMIN] },
  { to: '/admin/check-in', label: 'Check-in', icon: FiCheckSquare, roles: [ROLES.ADMIN, ROLES.VOLUNTEER] },
  { to: '/admin/announcements', label: 'Announcements', icon: FiBell, roles: [ROLES.ADMIN] },
  { to: '/admin/merchandise', label: 'Merchandise', icon: FiPackage, roles: [ROLES.ADMIN] },
  { to: '/admin/orders', label: 'Orders', icon: FiShoppingBag, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/fundraisers', label: 'Fundraisers', icon: FiHeart, roles: [ROLES.ADMIN, ROLES.TREASURER, ROLES.VOLUNTEER] },
  { to: '/admin/finance', label: 'Finance', icon: FiDollarSign, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/expenses', label: 'Expenses', icon: FiFileText, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/leadership', label: 'Leadership', icon: FiAward, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/settings', label: 'Settings', icon: FiSettings, roles: [ROLES.ADMIN] },
  { to: '/me/expenses', label: 'My expense claims', icon: FiClipboard, roles: [ROLES.VOLUNTEER] },
  { to: '/me', label: 'My profile', icon: FiUser, roles: [ROLES.ADMIN, ROLES.TREASURER, ROLES.VOLUNTEER] },
];

export function navItemsFor(role) {
  if (!role || role === ROLES.MEMBER) return MEMBER_NAV;
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}
