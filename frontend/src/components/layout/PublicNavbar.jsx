import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut, FiMenu, FiX, FiZap } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../utils/constants';
import Button from '../ui/Button';

const LINKS = [
  { to: '/events', label: 'Events' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/shop', label: 'Shop' },
];

export default function PublicNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900'}`;

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary-700">
          <FiZap aria-hidden="true" />
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
              <Button size="sm" variant="ghost" icon={FiLogOut} onClick={handleLogout}>
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
          className="rounded-md p-2 text-slate-600 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-slate-100 px-4 py-3 md:hidden">
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
