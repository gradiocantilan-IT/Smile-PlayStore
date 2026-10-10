import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gradiocantilan@gmail.com', pin }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuth(data.data.user);
        navigate('/admin');
      } else {
        setError(data.message || 'Invalid PIN');
      }
    } catch {
      setError('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FFF7F0]">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-[#202124] mb-6">Admin Sign-in</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setPin(val);
              if (val.length === 6) {
                // Auto-submit
                handleSubmit(e as any);
              }
            }}
            placeholder="Enter 6-digit PIN"
            className="w-full px-4 py-3 rounded-xl border border-[#FFE2CC] text-center text-lg tracking-widest focus:ring-2 focus:ring-[#FF7A00]"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </form>
      </div>
    </div>
  );
}
