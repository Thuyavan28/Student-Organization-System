import { Link } from 'react-router-dom';
import { LuExternalLink, LuZap } from 'react-icons/lu';

// Account details and log out live in the sidebar (UserPanel); the header
// carries the brand and the public-site link.
export default function Topbar() {
  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cf-border bg-white px-4 sm:px-6">
      <Link to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-cf-fg">
        <LuZap className="h-5 w-5" aria-hidden="true" />
        ClubFlow
      </Link>

      <Link
        to="/"
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-cf-fg transition-colors hover:bg-cf-hover"
      >
        <LuExternalLink className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Public site</span>
      </Link>
    </header>
  );
}
