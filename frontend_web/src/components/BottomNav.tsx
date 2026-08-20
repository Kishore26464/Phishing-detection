import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { MOBILE_NAV_ITEMS } from './nav';

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-sm lg:hidden">
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            clsx(
              'relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors',
              isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute top-0 h-1 w-8 rounded-b-full bg-primary" />}
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-label-sm">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
