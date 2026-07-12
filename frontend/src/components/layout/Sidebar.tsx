import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Navigation, Wrench,
  Fuel, BarChart3, Settings, LogOut, Gauge, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { type Module } from '../../lib/rolePermissions';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  /** If set, item is hidden when the role lacks access to this module.
   *  Items without a module (dashboard, maintenance, settings) are always shown. */
  module?: Module;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',   icon: <LayoutDashboard size={18} />, label: 'Dashboard'       },
  { to: '/fleet',       icon: <Truck size={18} />,           label: 'Fleet',           module: 'fleet'     },
  { to: '/drivers',     icon: <Users size={18} />,           label: 'Drivers',         module: 'drivers'   },
  { to: '/trips',       icon: <Navigation size={18} />,      label: 'Trips',           module: 'trips'     },
  { to: '/maintenance', icon: <Wrench size={18} />,          label: 'Maintenance'                          },
  { to: '/fuel',        icon: <Fuel size={18} />,            label: 'Fuel & Expenses', module: 'fuel'      },
  { to: '/analytics',   icon: <BarChart3 size={18} />,       label: 'Analytics',       module: 'analytics' },
  { to: '/settings',    icon: <Settings size={18} />,        label: 'Settings'                             },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { canAccess, logout, user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose?.();
  };

  const visibleItems = NAV_ITEMS.filter(item =>
    item.module ? canAccess(item.module) : true,
  );

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 h-full w-[200px] flex flex-col bg-[#0d0d10] border-r border-white/[0.06] z-50 transition-transform duration-200',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo / brand */}
        <div className="flex items-center justify-between gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex-shrink-0">
              <Gauge size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-base-text leading-tight">TransitOps</div>
              <div className="text-[9px] text-base-muted leading-tight uppercase tracking-wider">Transport Platform</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-base-muted hover:text-base-text hover:bg-white/[0.04] transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group relative',
                  isActive
                    ? 'bg-accent/10 text-accent font-semibold border border-accent/20 shadow-inner'
                    : 'text-base-muted hover:text-base-text hover:bg-white/[0.04]',
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                    )}
                    <span className={clsx(
                      'transition-colors',
                      isActive ? 'text-accent' : 'text-base-muted group-hover:text-base-text',
                    )}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-white/[0.06] p-3">
          {user && (
            <div className="flex items-center gap-2.5 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0">
                {user.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-base-text truncate">{user.name}</div>
                <div className="text-[9px] text-base-muted truncate">{role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            id="sidebar-logout-btn"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-base-muted hover:text-red-400 hover:bg-red-500/8 transition-all duration-150"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
