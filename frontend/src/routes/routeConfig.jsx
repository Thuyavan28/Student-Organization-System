import { lazy } from 'react';
import { ROLES } from '../utils/constants';

const { ADMIN, TREASURER, VOLUNTEER } = ROLES;

// lazy() plus a preload() hook, so a page's code can be fetched before the user opens it.
const loaders = new Map();
function lazyPage(loader) {
  const Component = lazy(loader);
  loaders.set(Component, loader);
  return Component;
}

const Landing = lazyPage(() => import('../pages/public/Landing'));
const Events = lazyPage(() => import('../pages/public/Events'));
const EventDetail = lazyPage(() => import('../pages/public/EventDetail'));
const Announcements = lazyPage(() => import('../pages/public/Announcements'));
const Shop = lazyPage(() => import('../pages/public/Shop'));
const Login = lazyPage(() => import('../pages/public/Login'));
const Register = lazyPage(() => import('../pages/public/Register'));
const MobilePay = lazyPage(() => import('../pages/public/MobilePay'));

const MyProfile = lazyPage(() => import('../pages/member/MyProfile'));
const MyTickets = lazyPage(() => import('../pages/member/MyTickets'));
const MyOrders = lazyPage(() => import('../pages/member/MyOrders'));
const MyExpenses = lazyPage(() => import('../pages/member/MyExpenses'));

const Dashboard = lazyPage(() => import('../pages/admin/Dashboard'));
const Members = lazyPage(() => import('../pages/admin/Members'));
const Staff = lazyPage(() => import('../pages/admin/Staff'));
const AdminEvents = lazyPage(() => import('../pages/admin/Events'));
const EventBookings = lazyPage(() => import('../pages/admin/EventBookings'));
const CheckIn = lazyPage(() => import('../pages/admin/CheckIn'));
const AdminAnnouncements = lazyPage(() => import('../pages/admin/Announcements'));
const Merchandise = lazyPage(() => import('../pages/admin/Merchandise'));
const Orders = lazyPage(() => import('../pages/admin/Orders'));
const Tasks = lazyPage(() => import('../pages/admin/Tasks'));
const Finance = lazyPage(() => import('../pages/admin/finance'));
const Expenses = lazyPage(() => import('../pages/admin/Expenses'));
const Leadership = lazyPage(() => import('../pages/admin/Leadership'));
const Settings = lazyPage(() => import('../pages/admin/Settings'));

const SystemStatesShowcase = lazyPage(() => import('../pages/public/SystemStatesShowcase'));

// `shellWhenSignedIn` pages open inside the dashboard (sidebar) for logged-in users and keep the public navbar for visitors. `roles` limits who may open an app page.
export const publicRoutes = [
  { path: '/', Component: Landing },
  { path: '/events', Component: Events, shellWhenSignedIn: true },
  { path: '/events/:id', Component: EventDetail, shellWhenSignedIn: true },
  { path: '/announcements', Component: Announcements, shellWhenSignedIn: true },
  { path: '/shop', Component: Shop, shellWhenSignedIn: true },
  { path: '/pay/:sessionId', Component: MobilePay },
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
  { path: '/system-states', Component: SystemStatesShowcase },
  { path: '/screens-demo', Component: SystemStatesShowcase },
];

export const appRoutes = [
  { path: '/me', Component: MyProfile },
  { path: '/me/tickets', Component: MyTickets },
  { path: '/me/orders', Component: MyOrders },
  { path: '/me/expenses', Component: MyExpenses, roles: [VOLUNTEER, ADMIN, TREASURER] },
  { path: '/admin', Component: Dashboard, roles: [ADMIN, TREASURER] },
  { path: '/admin/members', Component: Members, roles: [ADMIN, TREASURER] },
  { path: '/admin/staff', Component: Staff, roles: [ADMIN] },
  { path: '/admin/events', Component: AdminEvents, roles: [ADMIN, TREASURER] },
  { path: '/admin/events/:id/bookings', Component: EventBookings, roles: [ADMIN, TREASURER] },
  { path: '/admin/check-in', Component: CheckIn, roles: [ADMIN, VOLUNTEER] },
  { path: '/admin/announcements', Component: AdminAnnouncements, roles: [ADMIN] },
  { path: '/admin/merchandise', Component: Merchandise, roles: [ADMIN] },
  { path: '/admin/orders', Component: Orders, roles: [ADMIN, TREASURER] },
  { path: '/admin/tasks', Component: Tasks, roles: [ADMIN, TREASURER, VOLUNTEER] },
  { path: '/admin/finance', Component: Finance, roles: [ADMIN, TREASURER, VOLUNTEER] },
  { path: '/admin/expenses', Component: Expenses, roles: [ADMIN, TREASURER] },
  { path: '/admin/leadership', Component: Leadership, roles: [ADMIN, TREASURER] },
  { path: '/admin/settings', Component: Settings, roles: [ADMIN] },
];

// Fetches the code for a route ahead of time (hover, focus or idle), so opening it does not wait on the network.
export function preloadRoute(path) {
  const route = [...publicRoutes, ...appRoutes].find((item) => item.path === path);
  const loader = route && loaders.get(route.Component);
  return loader ? loader().catch(() => {}) : Promise.resolve();
}
