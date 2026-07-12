import React, { useState } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, role } = useAuth();
  const [query, setQuery] = useState('');

  const roleColors: Record<string, string> = {
    'Fleet Manager':     'bg-blue-500/15 text-blue-400 border-blue-500/25',
    'Dispatcher':        'bg-amber-500/15 text-amber-400 border-amber-500/25',
    'Safety Officer':    'bg-green-500/15 text-green-400 border-green-500/25',
    'Financial Analyst': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  };
  const roleStyle = role ? (roleColors[role] ?? 'bg-gray-500/15 text-gray-400') : '';

  return (
    <header className="fixed top-0 left-0 lg:left-[200px] right-0 h-[56px] flex items-center justify-between px-4 sm:px-6 bg-[#0d0d10]/95 border-b border-white/[0.06] backdrop-blur-sm z-20">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-base-muted hover:text-base-text hover:bg-white/[0.04] transition-colors flex-shrink-0"
          aria-label="Open menu"
          id="mobile-menu-btn"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-muted" />
          <input
            type="text"
            id="topbar-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search vehicles, drivers, trips..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-9 pr-4 py-2 text-sm text-base-text placeholder-base-muted outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all"
          />
        </div>
      </div>

      {/* Right side: user */}
      <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4 flex-shrink-0">
        <button className="relative p-2 rounded-lg hover:bg-white/[0.04] text-base-muted hover:text-base-text transition-colors hidden sm:block">
          <Bell size={16} />
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-base-text leading-tight">{user.name}</div>
              {role && (
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleStyle}`}>
                  {role}
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
              {user.avatar}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
