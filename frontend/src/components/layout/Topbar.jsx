import { Link, useNavigate } from 'react-router-dom';
import { LuExternalLink, LuLogOut, LuZap } from 'react-icons/lu';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../ui/Badge';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-cf-divider bg-white px-4">
      {/* Mobile brand */}
      <Link to="/" className="flex items-center gap-2 font-bold text-cf-fg lg:hidden">
        <LuZap className="h-4 w-4" aria-hidden="true" />
        ClubFlow
      </Link>

      {/* Desktop: public site link */}
      <Link to="/" className="hidden items-center gap-1.5 text-xs text-cf-muted hover:text-cf-fg transition-colors lg:flex">
        <LuExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Public site
      </Link>

      <div className="flex items-center gap-3">
        {/* User info */}
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold leading-tight text-cf-fg">{user?.name}</p>
          <p className="text-xs text-cf-muted">{user?.email}</p>
        </div>

        {/* Role badge */}
        <Badge tone="gray">{user?.role}</Badge>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cf-fg text-white text-xs font-semibold select-none" aria-hidden="true">
          {initials}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="flex items-center gap-1.5 rounded-xl p-2 text-cf-muted hover:bg-cf-hover hover:text-cf-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
        >
          <LuLogOut className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
