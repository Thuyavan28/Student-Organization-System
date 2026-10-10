import { NavLink } from 'react-router-dom';
import { FiZap } from 'react-icons/fi';
import { navItemsFor } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { user } = useAuth();
  const items = navItemsFor(user?.role);

  return (
    <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5 text-lg font-bold text-primary-700">
        <FiZap aria-hidden="true" />
        ClubFlow
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Sidebar">
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <p className="border-t border-slate-100 p-4 text-xs text-slate-400">Skyline Student Association</p>
    </aside>
  );
}
