import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LuLogOut, LuMenu, LuX, LuZap } from 'react-icons/lu';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../utils/constants';
import Button from '../ui/Button';
import { useInShell } from './ShellContext';

const LINKS = [
  { to: '/events', label: 'Events' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/shop', label: 'Shop' },
  { to: '/system-states', label: 'System States' },
];

export default function PublicNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const inShell = useInShell();

  const linkClass = ({ isActive }) =>
    `rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-colors ${isActive ? 'border-cf-border text-cf-fg' : 'border-transparent text-cf-fg hover:bg-cf-hover'}`;

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  // Signed-in users see these pages inside the dashboard shell, which already has navigation.
  if (inShell) return null;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-cf-border bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-cf-fg">
          <LuZap aria-hidden="true" />
          ClubFlow
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button size="sm" onClick={() => navigate(homeFor(user.role))}>
                {user.role === 'MEMBER' ? 'My account' : 'Dashboard'}
              </Button>
              <Button size="sm" variant="ghost" icon={LuLogOut} onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-cf-fg hover:bg-cf-hover md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <LuX className="h-5 w-5" /> : <LuMenu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-cf-divider px-4 py-3 md:hidden">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                <Button size="sm" onClick={() => navigate(homeFor(user.role))}>
                  {user.role === 'MEMBER' ? 'My account' : 'Dashboard'}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
