import { useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { navItemsFor } from '../../utils/constants';
import UserPanel from './UserPanel';

const STORAGE_KEY = 'clubflow.sidebar.collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// Fixed (sticky, full-height) sidebar. Only the nav list scrolls; the menu
// header and account block stay in place. Can be collapsed to icons only.
export default function Sidebar() {
  const { user } = useAuth();
  const items = navItemsFor(user?.role);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(STORAGE_KEY, value ? '0' : '1');
      } catch {
        /* storage unavailable: keep in-memory state */
      }
      return !value;
    });
  };

  return (
    <aside
      className={`no-print sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-cf-border bg-white transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Menu header */}
      <div className={`flex h-14 items-center border-b border-cf-divider ${collapsed ? 'justify-center' : 'justify-between px-5'}`}>
        {!collapsed && <span className="text-lg font-bold tracking-tight text-cf-fg">Menu</span>}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="rounded-xl p-2 text-cf-fg transition-colors hover:bg-cf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
        >
          {collapsed ? <LuChevronRight className="h-5 w-5" /> : <LuChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Sidebar navigation">
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl border text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3.5 py-2'
              } ${
                isActive
                  ? 'border-cf-border bg-white text-cf-fg'
                  : 'border-transparent text-cf-fg hover:bg-cf-hover'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-cf-divider p-3">
        <UserPanel collapsed={collapsed} />
      </div>
    </aside>
  );
}
