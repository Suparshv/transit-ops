import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Role, checkPermission, canAccessModule, type Module, type Action } from '../lib/rolePermissions';
import { ROLE_BY_EMAIL } from '../api/mockData';
import { cacheGet, cacheSet, cacheRemove, sessionGet, sessionSet, sessionRemove } from '../lib/offlineCache';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthState {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, role: Role, remember?: boolean) => Promise<{ success: boolean; error: string | null }>;
  logout: () => void;
  hasPermission: (module: Module, required?: Action) => boolean;
  canAccess: (module: Module) => boolean;
  failedAttempts: Record<string, number>;
  isLocked: (email: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MAX_FAILED_ATTEMPTS = 5;
const SESSION_KEY = 'session';
const LOCKOUT_KEY = 'lockout';
const REMEMBER_KEY = 'rememberMe';

function loadSavedSession(): AuthState {
  const remembered = cacheGet<boolean>(REMEMBER_KEY);
  if (remembered) {
    const saved = cacheGet<AuthState>(SESSION_KEY);
    if (saved?.isAuthenticated) return saved;
  }
  const session = sessionGet<AuthState>(SESSION_KEY);
  if (session?.isAuthenticated) return session;
  return { user: null, role: null, isAuthenticated: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(loadSavedSession);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>(() => {
    return cacheGet<Record<string, number>>(LOCKOUT_KEY) ?? {};
  });

  const isLocked = (email: string): boolean => {
    return (failedAttempts[email] ?? 0) >= MAX_FAILED_ATTEMPTS;
  };

  const incrementFailed = (email: string) => {
    const updated = { ...failedAttempts, [email]: (failedAttempts[email] ?? 0) + 1 };
    setFailedAttempts(updated);
    cacheSet(LOCKOUT_KEY, updated);
  };

  const resetFailed = (email: string) => {
    const updated = { ...failedAttempts };
    delete updated[email];
    setFailedAttempts(updated);
    cacheSet(LOCKOUT_KEY, updated);
  };

  const login = async (
    email: string,
    password: string,
    role: Role,
    remember = false,
  ): Promise<{ success: boolean; error: string | null }> => {
    // Check lockout first
    if (isLocked(email)) {
      return { success: false, error: 'Account locked after 5 failed attempts. Please contact your administrator.' };
    }

    const { apiLogin } = await import('../api');
    const res = await apiLogin(email, password);

    if (!res.success || !res.data) {
      incrementFailed(email);
      const remaining = MAX_FAILED_ATTEMPTS - (failedAttempts[email] ?? 0) - 1;
      if (remaining <= 0) {
        return { success: false, error: 'Account locked after 5 failed attempts. Please contact your administrator.' };
      }
      return { success: false, error: `${res.error} ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }

    // Validate that role matches allowed role for this email in demo
    const allowedRole = ROLE_BY_EMAIL[email];
    if (allowedRole && allowedRole !== role) {
      incrementFailed(email);
      const remaining = MAX_FAILED_ATTEMPTS - (failedAttempts[email] ?? 0) - 1;
      if (remaining <= 0) {
        return { success: false, error: 'Account locked after 5 failed attempts. Please contact your administrator.' };
      }
      return {
        success: false,
        error: `Role mismatch. This account is registered as "${allowedRole}". ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      };
    }

    resetFailed(email);
    const newState: AuthState = {
      user: {
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        avatar: res.data.avatar,
      },
      role,
      isAuthenticated: true,
    };
    setAuthState(newState);
    cacheRemove(SESSION_KEY);
    sessionRemove(SESSION_KEY);
    if (remember) {
      cacheSet(SESSION_KEY, newState);
      cacheSet(REMEMBER_KEY, true);
    } else {
      sessionSet(SESSION_KEY, newState);
      cacheRemove(REMEMBER_KEY);
    }
    return { success: true, error: null };
  };

  const logout = () => {
    setAuthState({ user: null, role: null, isAuthenticated: false });
    cacheRemove(SESSION_KEY);
    sessionRemove(SESSION_KEY);
    cacheRemove(REMEMBER_KEY);
  };

  const hasPermission = (module: Module, required: Action = 'view'): boolean => {
    if (!authState.role) return false;
    return checkPermission(authState.role, module, required);
  };

  const canAccess = (module: Module): boolean => {
    if (!authState.role) return false;
    return canAccessModule(authState.role, module);
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      hasPermission,
      canAccess,
      failedAttempts,
      isLocked,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
