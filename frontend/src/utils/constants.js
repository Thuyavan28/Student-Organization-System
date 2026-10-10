import {
  LuUsers, LuCalendar, LuSquareCheck, LuBell, LuShoppingBag, LuPackage, LuHeart,
  LuDollarSign, LuFileText, LuAward, LuSettings, LuUser, LuTag, LuClipboard, LuLayoutDashboard, LuUserCog,
} from 'react-icons/lu';

export const ROLES = {
  ADMIN: 'ADMIN',
  TREASURER: 'TREASURER',
  VOLUNTEER: 'VOLUNTEER',
  MEMBER: 'MEMBER',
};

export const STAFF_ROLES = [ROLES.ADMIN, ROLES.TREASURER, ROLES.VOLUNTEER];

// Monochrome badge tones: spec palette only — no blue.
export const TONES = {
  green:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  amber:  'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
  red:    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  gray:   'bg-cf-subtle text-cf-muted ring-1 ring-inset ring-cf-divider',
};

export const STATUS_TONE = {
  ACTIVE:      'green',
  PAID:        'green',
  VALID:       'green',
  CONFIRMED:   'green',
  PUBLISHED:   'green',
  FULFILLED:   'green',
  COMPLETED:   'green',
  REIMBURSED:  'green',
  INCOME:      'green',
  APPROVED:    'green',
  IN_PROGRESS: 'amber',
  PLACED:      'amber',
  PENDING:     'amber',
  SUBMITTED:   'amber',
  PLANNING:    'amber',
  DRAFT:       'gray',
  USED:        'gray',
  EXPIRED:     'red',
  CANCELLED:   'red',
  REJECTED:    'red',
  REFUNDED:    'orange',
  EXPENSE:     'red',
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


export function humanize(value) {
  if (!value) return '';
  const text = String(value).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// All nav items use Lucide set (react-icons/lu) per spec section 6.
export const MEMBER_NAV = [
  { to: '/me', label: 'My profile', icon: LuUser, end: true },
  { to: '/me/tickets', label: 'My tickets', icon: LuTag },
  { to: '/me/orders', label: 'My orders', icon: LuShoppingBag },
  { to: '/events', label: 'Events', icon: LuCalendar },
  { to: '/shop', label: 'Shop', icon: LuPackage },
  { to: '/announcements', label: 'Announcements', icon: LuBell },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LuLayoutDashboard, end: true, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/members', label: 'Members', icon: LuUsers, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/staff', label: 'Staff accounts', icon: LuUserCog, roles: [ROLES.ADMIN] },
  { to: '/admin/events', label: 'Events', icon: LuCalendar, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/check-in', label: 'Check-in', icon: LuSquareCheck, roles: [ROLES.ADMIN, ROLES.VOLUNTEER] },
  { to: '/admin/announcements', label: 'Announcements', icon: LuBell, roles: [ROLES.ADMIN] },
  { to: '/admin/merchandise', label: 'Merchandise', icon: LuPackage, roles: [ROLES.ADMIN] },
  { to: '/admin/orders', label: 'Orders', icon: LuShoppingBag, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/fundraisers', label: 'Fundraisers', icon: LuHeart, roles: [ROLES.ADMIN, ROLES.TREASURER, ROLES.VOLUNTEER] },
  { to: '/admin/finance', label: 'Finance', icon: LuDollarSign, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/expenses', label: 'Expenses', icon: LuFileText, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/leadership', label: 'Leadership', icon: LuAward, roles: [ROLES.ADMIN, ROLES.TREASURER] },
  { to: '/admin/settings', label: 'Settings', icon: LuSettings, roles: [ROLES.ADMIN] },
  { to: '/me/expenses', label: 'My expense claims', icon: LuClipboard, roles: [ROLES.VOLUNTEER] },
  { to: '/me', label: 'My profile', icon: LuUser, roles: [ROLES.ADMIN, ROLES.TREASURER, ROLES.VOLUNTEER] },
];

export function navItemsFor(role) {
  if (!role || role === ROLES.MEMBER) return MEMBER_NAV;
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}
