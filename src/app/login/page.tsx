'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogIn, AlertCircle, ArrowRight, Lock, Phone, Sparkles, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { login, changePassword, redirectToDashboard } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Temporary password change modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate concurrent submissions
    setError(null);
    setLoading(true);

    try {
      const user = await login(phone.trim(), password);
      if (user.must_change_password) {
        setShowChangePasswordModal(true);
      } else {
        redirectToDashboard(user.role);
      }
    } catch (err: any) {
      if (!err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        setError('Unable to reach the NutriSun API server. Please check your network connection or verify that the server is online.');
      } else if (err.response.status === 401) {
        setError(err.response.data?.error || 'Invalid phone number or password. Please check your credentials.');
      } else if (err.response.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Authentication failed. Please check your phone number and password and try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChangingPass(true);

    try {
      await changePassword(newPassword);
      setShowChangePasswordModal(false);
      redirectToDashboard();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleQuickLogin = (demoPhone: string, demoPass: string) => {
    setPhone(demoPhone);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 w-full max-w-full">
      <div className="w-full max-w-md">
        {/* Card Header with Official Logo */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="flex justify-center mb-2">
            <Image
              src="/logo.png"
              alt="NUTRISUN - Healthy Tasty Daily"
              width={76}
              height={76}
              priority
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#22222B] uppercase">
            NUTRISUN
          </h1>
          <p className="text-xs font-bold text-[#741B22] italic tracking-wider">
            Healthy Tasty Daily
          </p>
          <p className="text-[11px] sm:text-xs text-[#22222B]/70 mt-2 font-medium px-2">
            Subscription Meal Service • Sign In with Phone & Password
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-xl w-full">
          {error && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#B92F25] shrink-0 mt-0.5" />
              <div className="break-words min-w-0">
                <p className="font-bold">Authentication Issue</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543213"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold transition-all text-[#22222B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold transition-all text-[#22222B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500 mt-3">
              Forgot password? Contact Admin to verify your account and obtain a temporary password.
            </p>
          </form>

          {/* Quick Demo Credentials (Non-Production Only) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#B0BE8C]/30">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#741B22] mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#F7DE9D]" />
                Quick Demo Logins (Development Mode)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('9876543213', 'customer123')}
                  className="p-3 rounded-2xl border border-[#B0BE8C]/40 hover:border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-left transition-all group min-h-[44px] flex flex-col justify-center"
                >
                  <div className="font-black text-[#22222B] group-hover:text-[#3F4D25]">Alice (Customer)</div>
                  <div className="text-[11px] text-slate-400">9876543213</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('9876543210', 'adminpassword123')}
                  className="p-3 rounded-2xl border border-[#B0BE8C]/40 hover:border-[#741B22] hover:bg-[#741B22]/10 text-left transition-all group min-h-[44px] flex flex-col justify-center"
                >
                  <div className="font-black text-[#22222B] group-hover:text-[#741B22]">Executive Admin</div>
                  <div className="text-[11px] text-slate-400">9876543210</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('9876543211', 'chefpassword123')}
                  className="p-3 rounded-2xl border border-[#B0BE8C]/40 hover:border-[#F7DE9D] hover:bg-[#F7DE9D]/30 text-left transition-all group min-h-[44px] flex flex-col justify-center"
                >
                  <div className="font-black text-[#22222B]">Mario (Chef)</div>
                  <div className="text-[11px] text-slate-400">9876543211</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('9876543212', 'deliverypassword123')}
                  className="p-3 rounded-2xl border border-[#B0BE8C]/40 hover:border-[#B92F25] hover:bg-[#B92F25]/10 text-left transition-all group min-h-[44px] flex flex-col justify-center"
                >
                  <div className="font-black text-[#22222B] group-hover:text-[#B92F25]">Dave (Rider)</div>
                  <div className="text-[11px] text-slate-400">9876543212</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-[#22222B]/70 mt-5 sm:mt-6 font-medium">
          New to NutriSun?{' '}
          <Link
            href="/register"
            className="font-black text-[#B92F25] hover:text-[#741B22] inline-flex items-center gap-1 min-h-[44px] py-1"
          >
            Create a customer account <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>

      {/* Force Change Temporary Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#F7DE9D] shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center gap-3 mb-4 text-[#741B22]">
              <KeyRound className="w-7 h-7 text-[#741B22] shrink-0" />
              <div>
                <h3 className="text-lg font-black text-[#22222B]">Password Change Required</h3>
                <p className="text-xs text-slate-500">You logged in using a temporary password. Please set your new password.</p>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#22222B] mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new permanent password"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>

              <button
                type="submit"
                disabled={changingPass}
                className="w-full min-h-[44px] py-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs transition-all shadow-md"
              >
                {changingPass ? 'Updating...' : 'Set Permanent Password & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
