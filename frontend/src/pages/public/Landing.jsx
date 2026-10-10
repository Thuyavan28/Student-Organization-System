import { Link } from 'react-router-dom';
import { LuArrowRight, LuBell, LuCalendar, LuSquareCheck, LuDollarSign, LuHeart, LuShoppingBag, LuUsers } from 'react-icons/lu';
import { eventsApi } from '../../api/events.api';
import EventCard from '../../components/feature/EventCard';
import Button from '../../components/ui/Button';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { homeFor } from '../../utils/constants';
import PublicNavbar from '../../components/layout/PublicNavbar';

const FEATURES = [
  { icon: LuUsers, title: 'Membership', text: 'Join online, see your tier, expiry and perks, and renew before it lapses.' },
  { icon: LuCalendar, title: 'Events and tickets', text: 'Member and non-member prices, a hard seat limit and QR tickets on your phone.' },
  { icon: LuSquareCheck, title: 'Instant check-in', text: 'Volunteers scan the QR at the door and see at once if the guest is an active member.' },
  { icon: LuBell, title: 'Announcements', text: 'Post once, reach every member, and keep a permanent record of what was said.' },
  { icon: LuShoppingBag, title: 'Merchandise', text: 'Pick a size, order from your phone and never oversell: stock is tracked per size.' },
  { icon: LuHeart, title: 'Fundraisers', text: 'Split work into tasks, assign volunteers and watch progress toward the goal.' },
  { icon: LuDollarSign, title: 'Transparent money', text: 'Every payment and reimbursed expense lands in one ledger the treasurer can trust.' },
];

export default function Landing() {
  const { user } = useAuth();
  const events = useFetch(() => eventsApi.list({ upcoming: true, pageSize: 3 }), []);

  return (
    <>
      <PublicNavbar />
      <main>
        <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary-200">Skyline Student Association</p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
              One place for members, events, merchandise and money.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-primary-100">
              ClubFlow replaces the spreadsheet, the cash box, the notebook and the group chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to={homeFor(user.role)}>
                  <Button size="lg" className="!bg-white !text-primary-700 hover:!bg-primary-50">
                    Go to my account
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="!bg-white !text-primary-700 hover:!bg-primary-50">
                      Join the club
                    </Button>
                  </Link>
                  <Link to="/events">
                    <Button size="lg" variant="ghost" className="!text-white hover:!bg-white/10">
                      Browse events
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Upcoming events</h2>
            <Link to="/events" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
              All events <LuArrowRight aria-hidden="true" />
            </Link>
          </div>
          {events.loading && <SkeletonCards />}
          {events.error && <ErrorState message={events.error} onRetry={events.reload} />}
          {!events.loading && !events.error && events.data?.length === 0 && (
            <EmptyState icon={LuCalendar} title="No upcoming events" message="Check back soon for the next event." />
          )}
          {events.data?.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Everything the club runs on</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-slate-200 p-4">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          ClubFlow demo. Payments are simulated: no real money is charged.
        </footer>
      </main>
    </>
  );
}
