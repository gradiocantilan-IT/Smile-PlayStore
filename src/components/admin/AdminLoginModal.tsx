import React, { useState } from 'react';
import { X, Shield, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '../../types/index.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser, csrfToken: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('admin@smilestore.app');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { signInWithGoogle } = await import('../../lib/firebase/client.ts');
      const cred = await signInWithGoogle();
      if (!cred.user.email) {
        throw new Error('No email associated with Google account.');
      }

      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: cred.user.email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Access denied');
      }

      onLoginSuccess(data.data.user, data.data.csrfToken);
      onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError((err as Error).message || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || undefined }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      onLoginSuccess(data.data.user, data.data.csrfToken);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Access denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#F3F4F6] relative my-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#FFF7F0] border border-[#FFE2CC] flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Smile PlayStore"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://raw.githubusercontent.com/gradiocantilan-IT/LocalDocument/main/orangeware.png';
                }}
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124]">Smile PlayStore Admin</h3>
              <p className="text-[11px] text-[#6B7280]">Restricted access for marketplace staff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#202124] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Denied</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Google Authentication */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-semibold text-[#202124] flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? 'Connecting Google Account...' : 'Continue with Google (Firebase)'}</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#F3F4F6]"></div>
            <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">or email access</span>
            <div className="flex-1 h-px bg-[#F3F4F6]"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1.5">
              Authorized Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smilestore.app"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
              />
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1">
              Must match an email configured in ADMIN_EMAIL_ALLOWLIST.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1.5">
              Passphrase / Credential
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E56E00] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <Shield className="w-4 h-4" />
              <span>{loading ? 'Verifying Credentials...' : 'Sign in to Console'}</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#F3F4F6] text-center">
          <p className="text-[11px] text-[#9CA3AF]">
            Default allowed: <code className="text-[#6B7280]">admin@smilestore.app</code>, <code className="text-[#6B7280]">gradiocantilan@gmail.com</code>
          </p>
        </div>
      </div>
    </div>
  );
};
