import { Link } from 'react-router-dom';
import {
  LuArrowRight,
  LuBell,
  LuCalendar,
  LuCheck,
  LuChevronDown,
  LuCircleCheck,
  LuClock,
  LuDollarSign,
  LuHeart,
  LuMapPin,
  LuQrCode,
  LuShoppingBag,
  LuSquareCheck,
  LuTicket,
  LuUserPlus,
  LuUsers,
  LuZap,
} from 'react-icons/lu';
import { eventsApi } from '../../api/events.api';
import EventCard from '../../components/feature/EventCard';
import PublicNavbar from '../../components/layout/PublicNavbar';
import Button from '../../components/ui/Button';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { useReveal } from '../../hooks/useReveal';
import { homeFor } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

const FEATURES = [
  { icon: LuUsers, title: 'Membership', text: 'Join online, see your tier, expiry and perks, and renew before it lapses.' },
  { icon: LuCalendar, title: 'Events and tickets', text: 'Member and non-member prices, a hard seat limit and QR tickets on your phone.' },
  { icon: LuSquareCheck, title: 'Instant check-in', text: 'Volunteers scan the QR at the door and see at once if the guest is an active member.' },
  { icon: LuBell, title: 'Announcements', text: 'Post once, reach every member, and keep a permanent record of what was said.' },
  { icon: LuShoppingBag, title: 'Merchandise', text: 'Pick a size, order from your phone and never oversell: stock is tracked per size.' },
  { icon: LuHeart, title: 'Fundraisers', text: 'Split work into tasks, assign volunteers and watch progress toward the goal.' },
  { icon: LuDollarSign, title: 'Transparent money', text: 'Every payment and reimbursed expense lands in one ledger the treasurer can trust.' },
  { icon: LuTicket, title: 'Member pricing', text: 'The right price is applied automatically the moment you log in as a member.' },
];

const STEPS = [
  { icon: LuUserPlus, title: 'Create your account', text: 'Sign up in under a minute. No paperwork, no spreadsheets.' },
  { icon: LuTicket, title: 'Book or buy', text: 'Reserve event seats or order merchandise with your member price applied.' },
  { icon: LuQrCode, title: 'Show your QR', text: 'Your ticket lives on your phone. Scan in at the door and you are done.' },
];

const ROLES = [
  { icon: LuUsers, title: 'Members', points: ['Book tickets at member prices', 'Order merchandise by size', 'Keep every ticket and order in one place'] },
  { icon: LuSquareCheck, title: 'Volunteers', points: ['Scan tickets at the door', 'See member status instantly', 'Pick up fundraiser tasks'] },
  { icon: LuDollarSign, title: 'Treasurers', points: ['Track income and expenses', 'Approve reimbursement claims', 'Read one trusted ledger'] },
  { icon: LuZap, title: 'Admins', points: ['Run events and announcements', 'Manage members and stock', 'Monitor the whole club live'] },
];

const FAQS = [
  { q: 'Do I need to be a member to buy a ticket?', a: 'No. Anyone with an account can book. Members simply pay the lower member price, applied automatically when you log in.' },
  { q: 'Will I get a ticket I can show at the door?', a: 'Yes. After booking you get a QR ticket in My tickets. Volunteers scan it at check-in.' },
  { q: 'Can an event be oversold?', a: 'No. Every event has a hard seat limit, and merchandise stock is tracked per size, so the system stops sales at zero.' },
];

function HeroPreview({ event }) {
  const title = event?.title ?? 'Spring Gala';
  const when = event ? formatDateTime(event.startAt) : 'Saturday evening';
  const venue = event?.venue ?? 'Grand Ballroom';
  const memberPrice = event ? formatCurrency(event.memberPrice) : null;
  const seats = event?.seatsRemaining;

  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="float-slow rounded-3xl border border-white/15 bg-white p-6 text-cf-fg shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-cf-muted">Your ticket</p>
            <p className="mt-1 text-xl font-bold tracking-tight">{title}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <LuCircleCheck className="h-3.5 w-3.5" /> Confirmed
          </span>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-cf-muted">
          <li className="flex items-center gap-2"><LuClock className="h-4 w-4" /> {when}</li>
          <li className="flex items-center gap-2"><LuMapPin className="h-4 w-4" /> {venue}</li>
        </ul>
        <div className="my-5 border-t border-dashed border-cf-divider" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-cf-muted">Member price</p>
            <p className="text-2xl font-bold tabular-nums">{memberPrice ?? 'Rs 300'}</p>
          </div>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cf-border">
            <LuQrCode className="h-9 w-9" />
          </span>
        </div>
      </div>

      <div className="float-slower absolute -bottom-12 right-10 hidden rounded-2xl border border-white/15 bg-white px-4 py-3 text-cf-fg shadow-xl sm:block">
        <p className="text-xs text-cf-muted">Seats left</p>
        <p className="flex items-center gap-2 text-lg font-bold tabular-nums">
          <LuUsers className="h-4 w-4" /> {seats ?? 23}
        </p>
      </div>
      <div className="float-slower absolute -top-9 left-8 hidden rounded-2xl border border-white/15 bg-cf-fg px-4 py-3 text-white shadow-xl ring-1 ring-white/20 sm:block">
        <p className="flex items-center gap-2 text-sm font-semibold"><LuCheck className="h-4 w-4" /> Checked in</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const events = useFetch(() => eventsApi.list({ upcoming: true, pageSize: 3 }), []);
  const rootRef = useReveal();
  const featured = events.data?.[0];

  return (
    <>
      <PublicNavbar />
      <main ref={rootRef}>
        {/* Hero */}
        <section className="hero-grid relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-black text-white">
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative z-10">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                <LuZap className="h-3.5 w-3.5" aria-hidden="true" /> Skyline Student Association
              </p>
              <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                One place for members, events, merchandise and money.
              </h1>
              <p className="mt-5 max-w-lg text-base text-white/70">
                ClubFlow replaces the spreadsheet, the cash box, the notebook and the group chat, so your club spends time on people, not paperwork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <Link to={homeFor(user.role)}>
                    <Button size="lg" className="!bg-white !text-cf-fg hover:!bg-white/90">
                      Go to my account <LuArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" className="!bg-white !text-cf-fg hover:!bg-white/90">
                        Join the club <LuArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link to="/events">
                      <Button size="lg" variant="ghost" className="!border !border-white/30 !text-white hover:!bg-white/10">
                        Browse events
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                {['QR tickets', 'Member pricing', 'Live stock tracking'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <LuCircleCheck className="h-4 w-4 text-white" aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <HeroPreview event={featured} />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8">
          <div className="reveal mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-cf-fg">How it works</h2>
            <p className="mt-2 text-base text-cf-muted">From sign-up to the door in three steps.</p>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="reveal rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md"
                style={{ '--reveal-delay': `${index * 100}ms` }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cf-fg text-white">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-3xl font-bold tabular-nums text-cf-divider">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-cf-fg">{step.title}</h3>
                <p className="mt-1 text-sm text-cf-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Upcoming events */}
        <section className="border-y border-cf-divider bg-cf-subtle">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8">
            <div className="reveal mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-cf-fg">Upcoming events</h2>
                <p className="mt-1 text-base text-cf-muted">Grab a seat before they are gone.</p>
              </div>
              <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cf-fg hover:underline">
                All events <LuArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {events.loading && <SkeletonCards />}
            {events.error && <ErrorState message={events.error} onRetry={events.reload} />}
            {!events.loading && !events.error && events.data?.length === 0 && (
              <EmptyState icon={LuCalendar} title="No upcoming events" message="Check back soon for the next event." />
            )}
            {events.data?.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.data.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8">
          <div className="reveal mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-cf-fg">Everything the club runs on</h2>
            <p className="mt-2 text-base text-cf-muted">One system instead of five tools that never quite agree.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="reveal group rounded-2xl border border-cf-divider bg-white p-6 transition-colors duration-200 hover:border-cf-border hover:bg-cf-fg hover:text-white"
                style={{ '--reveal-delay': `${(index % 4) * 80}ms` }}
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cf-border transition-colors group-hover:border-white/30">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-cf-muted transition-colors group-hover:text-white/70">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="border-y border-cf-divider bg-cf-subtle">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8">
            <div className="reveal mx-auto mb-10 max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-cf-fg">Built for everyone in the club</h2>
              <p className="mt-2 text-base text-cf-muted">Each role sees exactly the tools it needs.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((role, index) => (
                <div
                  key={role.title}
                  className="reveal rounded-2xl border border-cf-border bg-white p-6"
                  style={{ '--reveal-delay': `${index * 80}ms` }}
                >
                  <role.icon className="mb-4 h-6 w-6" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-cf-fg">{role.title}</h3>
                  <ul className="mt-3 space-y-2">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-cf-muted">
                        <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-cf-fg" aria-hidden="true" /> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <h2 className="reveal mb-8 text-center text-3xl font-bold tracking-tight text-cf-fg">Questions, answered</h2>
          <div className="reveal space-y-3">
            {FAQS.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-cf-border bg-white px-5 py-4 open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-cf-fg [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <LuChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm text-cf-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        {!user && (
          <section className="px-4 pb-16 sm:px-8">
            <div className="hero-grid reveal relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-black px-6 py-14 text-center text-white sm:px-12">
              <h2 className="relative text-3xl font-bold tracking-tight">Ready to run your club the easy way?</h2>
              <p className="relative mx-auto mt-3 max-w-lg text-base text-white/70">Create a free account and book your first event in minutes.</p>
              <div className="relative mt-7 flex flex-wrap justify-center gap-3">
                <Link to="/register">
                  <Button size="lg" className="!bg-white !text-cf-fg hover:!bg-white/90">Create an account</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="ghost" className="!border !border-white/30 !text-white hover:!bg-white/10">Log in</Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        <footer className="border-t border-cf-border">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr] sm:px-8">
            <div>
              <p className="flex items-center gap-2 text-lg font-bold tracking-tight text-cf-fg">
                <LuZap className="h-5 w-5" aria-hidden="true" /> ClubFlow
              </p>
              <p className="mt-2 max-w-xs text-sm text-cf-muted">The all-in-one system for student organizations.</p>
            </div>
            <nav aria-label="Explore" className="space-y-2 text-sm">
              <p className="font-semibold text-cf-fg">Explore</p>
              <Link className="block text-cf-muted hover:text-cf-fg" to="/events">Events</Link>
              <Link className="block text-cf-muted hover:text-cf-fg" to="/announcements">Announcements</Link>
              <Link className="block text-cf-muted hover:text-cf-fg" to="/shop">Shop</Link>
            </nav>
            <nav aria-label="Account" className="space-y-2 text-sm">
              <p className="font-semibold text-cf-fg">Account</p>
              <Link className="block text-cf-muted hover:text-cf-fg" to="/login">Log in</Link>
              <Link className="block text-cf-muted hover:text-cf-fg" to="/register">Sign up</Link>
            </nav>
          </div>
          <p className="border-t border-cf-divider py-4 text-center text-xs text-cf-muted">
            © ClubFlow. All rights reserved.
          </p>
        </footer>
      </main>
    </>
  );
}
