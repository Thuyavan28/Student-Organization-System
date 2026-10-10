import { LuZap } from 'react-icons/lu';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { navItemsFor } from '../../utils/constants';

export default function Sidebar() {
  const { user } = useAuth();
  const items = navItemsFor(user?.role);

  return (
    <aside className="no-print hidden w-56 shrink-0 flex-col border-r border-cf-divider bg-white lg:flex">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-cf-divider px-5">
        <LuZap className="h-5 w-5 text-cf-fg" aria-hidden="true" />
        <span className="text-sm font-bold tracking-tight text-cf-fg">ClubFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Sidebar navigation">
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors mb-0.5 ${
                isActive
                  ? 'bg-cf-fg text-white'
                  : 'text-cf-muted hover:bg-cf-hover hover:text-cf-fg'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <p className="border-t border-cf-divider p-4 text-xs text-cf-muted">Skyline Student Association</p>
    </aside>
  );
}
