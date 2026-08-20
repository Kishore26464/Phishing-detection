import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { NAV_ITEMS } from './nav';

export function Sidebar() {
  return (
    <nav className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-outline-variant/30 bg-surface-container-lowest px-2 py-4 lg:flex">
      <div className="mb-8 px-2 pt-2">
        <h1 className="text-headline-md font-bold tracking-tighter text-primary">PhishGuard</h1>
        <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">Signal Forensics</p>
      </div>

      <ul className="flex flex-grow flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-4 rounded px-4 py-2.5 transition-colors duration-150',
                  isActive
                    ? 'border-r-2 border-primary bg-primary-container/20 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                )
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-label-md">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-outline-variant/30 px-2 pt-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-4 rounded px-4 py-2.5 transition-colors duration-150',
              isActive
                ? 'border-r-2 border-primary bg-primary-container/20 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
            )
          }
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="text-label-md">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
