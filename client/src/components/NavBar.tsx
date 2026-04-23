import { Link, useLocation } from 'react-router-dom';

function TimerIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DashIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const LINKS = [
  { path: '/',           label: 'Timer',     Icon: TimerIcon },
  { path: '/dashboard',  label: 'Dashboard', Icon: DashIcon },
  { path: '/settings',   label: 'Settings',  Icon: SettingsIcon },
];

interface NavBarProps {
  onOpenGuide: () => void;
}

export function NavBar({ onOpenGuide }: NavBarProps) {
  const { pathname } = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="sticky top-0 z-50 flex justify-center px-6 py-3 border-b border-white/[0.05] bg-tempo-bg/80 backdrop-blur-xl"
    >
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
        {LINKS.map(({ path, label, Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm transition-all duration-200 no-underline',
                active
                  ? 'font-semibold text-tempo-text bg-tempo-violet/[0.18] border border-tempo-violet/30'
                  : 'font-normal text-tempo-muted border border-transparent hover:text-tempo-text/70',
              ].join(' ')}
            >
              <Icon active={active} />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-tempo-muted border border-transparent hover:text-tempo-text/80"
        >
          What is Tempo?
        </button>
      </div>
    </nav>
  );
}
