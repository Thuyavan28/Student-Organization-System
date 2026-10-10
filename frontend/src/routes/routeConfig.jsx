import { lazy } from 'react';
import { ROLES } from '../utils/constants';

const { ADMIN, TREASURER, VOLUNTEER } = ROLES;

const Landing = lazy(() => import('../pages/public/Landing'));
const Events = lazy(() => import('../pages/public/Events'));
const EventDetail = lazy(() => import('../pages/public/EventDetail'));
const Announcements = lazy(() => import('../pages/public/Announcements'));
const Shop = lazy(() => import('../pages/public/Shop'));
const Login = lazy(() => import('../pages/public/Login'));
const Register = lazy(() => import('../pages/public/Register'));
const MobilePay = lazy(() => import('../pages/public/MobilePay'));

const MyProfile = lazy(() => import('../pages/member/MyProfile'));
const MyTickets = lazy(() => import('../pages/member/MyTickets'));
const MyOrders = lazy(() => import('../pages/member/MyOrders'));
const MyExpenses = lazy(() => import('../pages/member/MyExpenses'));

const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const Members = lazy(() => import('../pages/admin/Members'));
const Staff = lazy(() => import('../pages/admin/Staff'));
const AdminEvents = lazy(() => import('../pages/admin/Events'));
const EventBookings = lazy(() => import('../pages/admin/EventBookings'));
const CheckIn = lazy(() => import('../pages/admin/CheckIn'));
const AdminAnnouncements = lazy(() => import('../pages/admin/Announcements'));
const Merchandise = lazy(() => import('../pages/admin/Merchandise'));
const Orders = lazy(() => import('../pages/admin/Orders'));
const Fundraisers = lazy(() => import('../pages/admin/Fundraisers'));
const FundraiserDetail = lazy(() => import('../pages/admin/FundraiserDetail'));
const Finance = lazy(() => import('../pages/admin/finance'));
const Expenses = lazy(() => import('../pages/admin/Expenses'));
const Leadership = lazy(() => import('../pages/admin/Leadership'));
const Settings = lazy(() => import('../pages/admin/Settings'));

const SystemStatesShowcase = lazy(() => import('../pages/public/SystemStatesShowcase'));

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
  { path: '/admin/fundraisers', Component: Fundraisers, roles: [ADMIN, TREASURER, VOLUNTEER] },
  { path: '/admin/fundraisers/:id', Component: FundraiserDetail, roles: [ADMIN, TREASURER, VOLUNTEER] },
  { path: '/admin/finance', Component: Finance, roles: [ADMIN, TREASURER] },
  { path: '/admin/expenses', Component: Expenses, roles: [ADMIN, TREASURER] },
  { path: '/admin/leadership', Component: Leadership, roles: [ADMIN, TREASURER] },
  { path: '/admin/settings', Component: Settings, roles: [ADMIN] },
];
