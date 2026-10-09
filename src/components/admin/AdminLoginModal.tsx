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

  if (!isOpen) return null;

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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFF7F0] text-[#FF7A00] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124]">Administrator Console</h3>
              <p className="text-[11px] text-[#6B7280]">Restricted access for Smile Store staff</p>
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
