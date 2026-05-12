import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const tabs = [
    { name: 'War Room', path: '/' },
    { name: 'Screener', path: '/screener' },
    { name: 'Deep Dive', path: '/deep-dive/005930' },
    { name: 'Archive', path: '/archive' },
  ];

  return (
    <header className="sticky top-0 h-16 bg-surface border-b border-border-subtle z-50 flex items-center px-6 gap-6">
      <div className="text-lg font-bold text-ink-primary whitespace-nowrap">SUPGEUK WAR</div>
      
      <nav className="flex h-full gap-4">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path.startsWith('/deep-dive') && location.pathname.startsWith('/deep-dive'));
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex items-center h-full px-2 border-b-2 font-medium text-sm transition duration-fast ${isActive ? 'border-brand-primary text-ink-primary' : 'border-transparent text-ink-secondary hover:bg-surface-2'}`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex-grow" />

      <div className="flex items-center gap-4 text-sm font-numeric">
        <span className="px-2 py-1 bg-status-confirmed/20 text-status-confirmed rounded text-xs font-semibold uppercase">Confirmed</span>
        <div className="flex items-center gap-2">
          <span className="text-ink-secondary">KOSPI</span>
          <span className="text-ink-primary font-bold">2,654.21</span>
          <span className="text-num-up">+0.50%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-secondary">KOSDAQ</span>
          <span className="text-ink-primary font-bold">842.11</span>
          <span className="text-num-down">-0.20%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-secondary">USD/KRW</span>
          <span className="text-ink-primary font-bold">1,350.20</span>
        </div>
      </div>
    </header>
  );
}
