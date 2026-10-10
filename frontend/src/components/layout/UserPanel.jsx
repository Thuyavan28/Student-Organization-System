import { useNavigate } from 'react-router-dom';
import { LuLogOut } from 'react-icons/lu';
import { useAuth } from '../../hooks/useAuth';
import { humanize } from '../../utils/constants';

// Signed-in user's name, email, role and log-out action. Lives in the sidebar
// (desktop) and the "More" sheet (mobile) instead of the top navbar.
export default function UserPanel({ onLogout, collapsed = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = () => {
    logout();
    onLogout?.();
    navigate('/login');
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-cf-fg text-sm font-semibold text-white"
          title={user?.name}
          aria-hidden="true"
        >
          {initials}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="rounded-xl p-2 text-cf-fg transition-colors hover:bg-cf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
        >
          <LuLogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-cf-fg text-sm font-semibold text-white"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-cf-fg">{user?.name}</p>
        <p className="truncate text-xs text-cf-muted" title={user?.email}>{user?.email}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-cf-muted">{humanize(user?.role ?? '')}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        title="Log out"
        className="shrink-0 rounded-xl p-2 text-cf-fg transition-colors hover:bg-cf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
      >
        <LuLogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
