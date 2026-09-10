'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sun, LogIn, AlertCircle, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, redirectToDashboard } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      redirectToDashboard(user.role);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials or connection error.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-400 text-white shadow-lg shadow-emerald-600/20 mb-3">
            <Sun className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Log in to manage your meals, kitchen prep, or delivery route.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('alice@example.com', 'customer123')}
                className="p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all"
              >
                <div className="font-bold text-slate-800">Alice (Customer)</div>
                <div className="text-[11px] text-slate-500">alice@example.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('chef@nutrisun.com', 'chef123')}
                className="p-2 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-left transition-all"
              >
                <div className="font-bold text-slate-800">Mario (Head Chef)</div>
                <div className="text-[11px] text-slate-500">chef@nutrisun.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('delivery@nutrisun.com', 'delivery123')}
                className="p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
              >
                <div className="font-bold text-slate-800">Dave (Rider)</div>
                <div className="text-[11px] text-slate-500">delivery@nutrisun.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin_master@nutrisun.com', 'adminpassword123')}
                className="p-2 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left transition-all"
              >
                <div className="font-bold text-slate-800">Admin Account</div>
                <div className="text-[11px] text-slate-500">admin_master@nutrisun.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
          >
            Create one now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}
