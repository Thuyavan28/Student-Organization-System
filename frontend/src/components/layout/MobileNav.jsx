import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMoreHorizontal } from 'react-icons/fi';
import { navItemsFor } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../ui/Modal';

const VISIBLE_COUNT = 4;

export default function MobileNav() {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = navItemsFor(user?.role);
  const primary = items.slice(0, VISIBLE_COUNT);
  const overflow = items.slice(VISIBLE_COUNT);

  const itemClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-primary-700' : 'text-slate-500'}`;

  return (
    <>
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        {primary.map((item) => (
          <NavLink key={item.to + item.label} to={item.to} end={item.end} className={itemClass}>
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button type="button" className={itemClass({ isActive: false })} onClick={() => setMoreOpen(true)}>
            <FiMoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        )}
      </nav>
      <Modal open={moreOpen} title="More" onClose={() => setMoreOpen(false)} size="sm">
        <ul className="space-y-1">
          {overflow.map((item) => (
            <li key={item.to + item.label}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
