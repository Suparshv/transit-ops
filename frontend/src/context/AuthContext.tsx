import React, { createContext, useContext, useState, ReactNode } from 'react';
import { type Role, checkPermission, canAccessModule, type Module, type Action } from '../lib/rolePermissions';
import { cacheGet, cacheSet, cacheRemove, sessionGet, sessionSet, sessionRemove } from '../lib/offlineCache';
import { apiLogin as apiLoginCall, removeToken, setToken } from '../api';

interface AuthUser {
  id: number;
  email: string;
  /** Display name derived from email prefix (backend doesn't store name). */
  name: string;
  /** Initials avatar derived from name. */
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
const SESSION_KEY  = 'session';
const LOCKOUT_KEY  = 'lockout';
const REMEMBER_KEY = 'rememberMe';

/** Derive a display name from an email address (e.g. "fleet@transitops.in" → "Fleet"). */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Two-letter initials from a name string. */
function initialsFrom(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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

  const isLocked = (email: string): boolean =>
    (failedAttempts[email] ?? 0) >= MAX_FAILED_ATTEMPTS;

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
    // Frontend lockout guard (mirrors backend, for instant UX feedback)
    if (isLocked(email)) {
      return {
        success: false,
        error: 'Account locked after 5 failed attempts. Please contact your administrator.',
      };
    }

    const res = await apiLoginCall(email, password, role);

    if (!res.success || !res.data) {
      // Backend handles lockout too — reflect its message directly
      const msg = res.error ?? 'Invalid credentials.';
      incrementFailed(email);
      return { success: false, error: msg };
    }

    resetFailed(email);

    const name   = nameFromEmail(email);
    const avatar = initialsFrom(name);

    const newState: AuthState = {
      user: { id: res.data.user.id, email: res.data.user.email, name, avatar },
      role,
      isAuthenticated: true,
    };

    setAuthState(newState);

    // Persist session (without token — token is already in localStorage via setToken)
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
    removeToken();
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
