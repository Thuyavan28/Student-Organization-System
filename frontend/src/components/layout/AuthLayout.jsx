import { Link } from 'react-router-dom';
import { LuArrowLeft, LuBell, LuCalendar, LuQrCode, LuShoppingBag, LuZap } from 'react-icons/lu';

const HIGHLIGHTS = [
  { icon: LuCalendar, title: 'Events and tickets', text: 'Book seats at member prices and keep your QR ticket on your phone.' },
  { icon: LuQrCode, title: 'Instant check-in', text: 'Scan at the door. No lists, no queues.' },
  { icon: LuShoppingBag, title: 'Merchandise', text: 'Order by size, with stock tracked for every variant.' },
  { icon: LuBell, title: 'Announcements', text: 'Hear about club news the moment it is posted.' },
];

// Split-screen shell for login / register: brand panel on the left (desktop only),
// the form on the right.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="auth-brand relative hidden flex-col justify-between overflow-hidden bg-cf-fg p-12 text-white lg:flex">
        <Link to="/" className="relative z-10 flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <LuZap className="h-5 w-5" aria-hidden="true" /> ClubFlow
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Everything your student club runs on, in one place.
          </h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/5">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-white/65">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/50">Skyline Student Association</p>
      </aside>

      <section className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-cf-fg lg:hidden">
            <LuZap className="h-5 w-5" aria-hidden="true" /> ClubFlow
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-cf-fg transition-colors hover:bg-cf-hover"
          >
            <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <h1 className="text-page-title text-cf-fg">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-cf-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
