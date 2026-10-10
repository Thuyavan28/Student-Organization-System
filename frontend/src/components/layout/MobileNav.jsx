import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LuEllipsis } from 'react-icons/lu';
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
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
      isActive ? 'text-cf-fg' : 'text-cf-muted'
    }`;

  return (
    <>
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-cf-divider bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary navigation"
      >
        {primary.map((item) => (
          <NavLink key={item.to + item.label} to={item.to} end={item.end} className={itemClass}>
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button type="button" className={itemClass({ isActive: false })} onClick={() => setMoreOpen(true)}>
            <LuEllipsis className="h-5 w-5" aria-hidden="true" />
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
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-cf-fg text-white' : 'text-cf-muted hover:bg-cf-hover hover:text-cf-fg'
                  }`
                }
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
