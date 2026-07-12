import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { type Module } from './lib/rolePermissions';

// Pages
import Login            from './pages/Login';
import Dashboard        from './pages/Dashboard';
import VehicleRegistry  from './pages/VehicleRegistry';
import DriversSafety    from './pages/DriversSafety';
import TripDispatcher   from './pages/TripDispatcher';
import Maintenance      from './pages/Maintenance';
import FuelExpenses     from './pages/FuelExpenses';
import Analytics        from './pages/Analytics';
import Settings         from './pages/Settings';

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function RequireModule({ module }: { module: Module }) {
  const { canAccess } = useAuth();
  if (!canAccess(module)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-base-bg overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[200px]">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pt-[calc(56px+16px)] sm:pt-[calc(56px+24px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route element={<RequireModule module="fleet" />}>
          <Route path="/fleet" element={<VehicleRegistry />} />
        </Route>

        <Route element={<RequireModule module="drivers" />}>
          <Route path="/drivers" element={<DriversSafety />} />
        </Route>

        <Route element={<RequireModule module="trips" />}>
          <Route path="/trips" element={<TripDispatcher />} />
        </Route>

        <Route element={<RequireModule module="maintenance" />}>
          <Route path="/maintenance" element={<Maintenance />} />
        </Route>

        <Route element={<RequireModule module="fuel" />}>
          <Route path="/fuel" element={<FuelExpenses />} />
        </Route>

        <Route element={<RequireModule module="analytics" />}>
          <Route path="/analytics" element={<Analytics />} />
        </Route>

        <Route element={<RequireModule module="settings" />}>
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: '#18181d',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e8e8ef',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
