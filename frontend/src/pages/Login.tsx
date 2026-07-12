import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Eye, EyeOff, AlertTriangle, Lock, X, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cacheGet } from '../lib/offlineCache';
import { type Role, ALL_ROLES } from '../lib/rolePermissions';
import { apiForgotPassword } from '../api';

const ROLE_ACCESS_HINTS: Record<Role, string> = {
  'Fleet Manager':     'Fleet Registry, Maintenance, Drivers, Analytics',
  'Dispatcher':        'Dashboard, Trip Management, Fleet (view)',
  'Safety Officer':    'Driver Profiles, Compliance, Trips (view)',
  'Financial Analyst': 'Fuel & Expenses, Analytics, Fleet (view)',
};

const DEMO_CREDENTIALS: { role: Role; email: string }[] = [
  { role: 'Fleet Manager',     email: 'manager@transitops.in'    },
  { role: 'Dispatcher',        email: 'dispatcher@transitops.in' },
  { role: 'Safety Officer',    email: 'safety@transitops.in'     },
  { role: 'Financial Analyst', email: 'analyst@transitops.in'    },
];

// ─── Forgot Password Modal ─────────────────────────────────────────────────────

interface ForgotPasswordModalProps {
  onClose: () => void;
  prefillEmail?: string;
}

function ForgotPasswordModal({ onClose, prefillEmail = '' }: ForgotPasswordModalProps) {
  const [fpEmail,   setFpEmail]   = useState(prefillEmail);
  const [sending,   setSending]   = useState(false);
  const [message,   setMessage]   = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fpEmail.trim()) return;
    setSending(true);
    setMessage(null);

    const res = await apiForgotPassword(fpEmail.trim());
    setSending(false);

    // The backend returns 501 with an error message for this hackathon build.
    // Surface whatever the server says so users know to contact the admin.
    if (res.success) {
      setMessage({ text: 'If an account exists for that email, a reset link has been sent.', isError: false });
    } else {
      setMessage({ text: res.error ?? 'Unable to process request.', isError: true });
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fp-modal-title"
    >
      <div className="w-full max-w-sm bg-[#111115] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
                <Mail size={14} className="text-accent" />
              </div>
              <h2 id="fp-modal-title" className="text-base font-bold text-base-text">
                Reset your password
              </h2>
            </div>
            <p className="text-xs text-base-muted">
              Enter your account email and we'll send reset instructions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-base-muted hover:text-base-text hover:bg-white/[0.04] transition-colors flex-shrink-0 ml-3"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Response message */}
        {message && (
          <div className={`mb-4 rounded-lg border px-4 py-3 flex gap-2.5 items-start animate-fade-in text-xs ${
            message.isError
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-green-500/30 bg-green-500/10 text-green-300'
          }`}>
            {message.isError
              ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              : <Mail size={14} className="flex-shrink-0 mt-0.5" />
            }
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="forgot-password-form">
          <div>
            <label htmlFor="fp-email" className="form-label">Email address</label>
            <input
              id="fp-email"
              type="email"
              required
              value={fpEmail}
              onChange={e => { setFpEmail(e.target.value); setMessage(null); }}
              placeholder="your@email.com"
              className="form-input"
              disabled={sending}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-white/[0.08] text-sm text-base-muted hover:text-base-text hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !fpEmail.trim()}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Login Page ────────────────────────────────────────────────────────────────

export default function Login() {
  const { login, isLocked, failedAttempts } = useAuth();
  const navigate = useNavigate();

  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [role,           setRole]           = useState<Role>('Dispatcher');
  const [remember,       setRemember]       = useState(() => cacheGet<boolean>('rememberMe') ?? false);
  const [showPass,       setShowPass]       = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const locked   = isLocked(email);
  const attempts = failedAttempts[email] ?? 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setLoading(true);
    setError(null);

    const result = await login(email, password, role, remember);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleDemoFill = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword('password123');
    setRole(cred.role);
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0c]">
      {/* Forgot password modal — rendered at the root so it overlays everything */}
      {showForgotModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotModal(false)}
          prefillEmail={email}
        />
      )}

      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-[#111115] border-r border-white/[0.06] p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Gauge size={20} className="text-accent" />
          </div>
          <div>
            <div className="text-lg font-bold text-base-text">TransitOps</div>
            <div className="text-xs text-base-muted">Smart Transport Operations Platform</div>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <h1 className="text-3xl font-bold text-base-text leading-tight mb-4">
            Fleet management,<br />
            <span className="text-accent">reimagined.</span>
          </h1>
          <p className="text-base-muted text-sm leading-relaxed mb-8">
            Centralized vehicle, driver, and trip management for modern logistics teams. Real-time visibility, zero spreadsheets.
          </p>

          {/* Four roles */}
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-base-muted">
            One login, four roles:
          </div>
          <div className="space-y-2">
            {ALL_ROLES.map(r => (
              <div key={r} className="flex items-start gap-3 group">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-base-text group-hover:text-accent transition-colors">{r}</div>
                  <div className="text-xs text-base-muted">{ROLE_ACCESS_HINTS[r]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-base-muted">
          © 2026 TransitOps · Odoo Hackathon Build · Offline-ready
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Gauge size={16} className="text-accent" />
            </div>
            <span className="font-bold text-base-text">TransitOps</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-base-text">Sign in to your account</h2>
            <p className="text-base-muted text-sm mt-1">Enter your credentials and select your role to continue.</p>
          </div>

          {/* Error / Lockout callout */}
          {(error || locked) && (
            <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 flex gap-3 items-start animate-fade-in">
              {locked
                ? <Lock size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                : <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              }
              <div>
                <div className="text-sm font-semibold text-red-400 mb-0.5">
                  {locked ? 'Account Locked' : '✗ Invalid credentials.'}
                </div>
                <div className="text-xs text-red-400/80">
                  {locked
                    ? 'Account locked after 5 failed attempts. Please contact your administrator to unlock.'
                    : error}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="form-label">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                placeholder="raven.k@transitops.in"
                className="form-input"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="form-input pr-10"
                  disabled={loading || locked}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-muted hover:text-base-text transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Role (RBAC) dropdown */}
            <div>
              <label htmlFor="login-role" className="form-label">Role (RBAC)</label>
              <select
                id="login-role"
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="form-input cursor-pointer"
                disabled={loading || locked}
              >
                {ALL_ROLES.map(r => (
                  <option key={r} value={r} style={{ background: '#18181d' }}>{r}</option>
                ))}
              </select>
            </div>

            {/* Remember me + Forgot password — same row per Screen 0 spec */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border border-white/20 bg-base-card accent-amber-500 cursor-pointer"
                />
                <span className="text-sm text-base-muted group-hover:text-base-text transition-colors">Remember me</span>
              </label>
              <button
                type="button"
                id="forgot-password-btn"
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-accent hover:text-accent-light transition-colors link-animated"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading || locked}
              className="btn-primary w-full text-center flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in…
                </>
              ) : locked ? (
                <><Lock size={14} /> Account Locked</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-base-muted mb-3">
              Demo Credentials (password: password123)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map(cred => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => handleDemoFill(cred)}
                  className="text-left px-3 py-2 rounded-lg border border-white/[0.06] hover:border-accent/30 hover:bg-accent/5 transition-all text-xs group"
                >
                  <div className="font-semibold text-base-text group-hover:text-accent transition-colors text-[11px]">{cred.role}</div>
                  <div className="text-base-muted truncate text-[10px] mt-0.5">{cred.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Failed attempts warning */}
          {attempts > 0 && attempts < 5 && !locked && (
            <div className="mt-3 text-center text-xs text-orange-400">
              {attempts} failed attempt{attempts !== 1 ? 's' : ''} · Account locks at 5
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
