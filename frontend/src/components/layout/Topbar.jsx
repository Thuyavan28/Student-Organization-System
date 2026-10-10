import { Link, useNavigate } from 'react-router-dom';
import { FiExternalLink, FiLogOut, FiZap } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <Link to="/" className="flex items-center gap-2 font-bold text-primary-700 lg:hidden">
        <FiZap aria-hidden="true" />
        ClubFlow
      </Link>
      <Link to="/" className="hidden items-center gap-1 text-sm text-slate-500 hover:text-slate-800 lg:flex">
        <FiExternalLink aria-hidden="true" />
        Public site
      </Link>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <Badge tone="blue">{user?.role}</Badge>
        <Button size="sm" variant="ghost" icon={FiLogOut} onClick={handleLogout} aria-label="Log out">
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </header>
  );
}
