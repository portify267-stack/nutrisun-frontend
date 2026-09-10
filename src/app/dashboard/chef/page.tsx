'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  kitchenApi,
  KitchenCountResponse,
  SlotCountBreakdown,
  MenuItem,
} from '@/lib/api';
import {
  ChefHat,
  Flame,
  Calendar,
  RefreshCw,
  Sparkles,
  Coffee,
  Utensils,
  Moon,
  Ban,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

export default function ChefDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [data, setData] = useState<KitchenCountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'chef' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchCookingCount = async () => {
    setLoading(true);
    try {
      const res = await kitchenApi.getTodayCount(date);
      setData(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch kitchen cooking count:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'chef' || user.role === 'admin')) {
      fetchCookingCount();
    }
  }, [user, date]);

  const getSlotIcon = (slotKey: string) => {
    switch (slotKey) {
      case 'breakfast':
        return <Coffee className="w-5 h-5 text-amber-500" />;
      case 'lunch':
        return <Utensils className="w-5 h-5 text-emerald-500" />;
      case 'dinner':
        return <Moon className="w-5 h-5 text-indigo-500" />;
      default:
        return <ChefHat className="w-5 h-5 text-slate-500" />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  const slots = ['breakfast', 'lunch', 'dinner'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-900/10 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/50 text-amber-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <ChefHat className="w-3.5 h-3.5 text-white" />
            Kitchen Live Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Kitchen Live Prep Counter
          </h1>
          <p className="text-sm text-amber-100 mt-1 max-w-xl">
            Real-time batch counts grouped by meal slot. Skipped meals are automatically subtracted from kitchen cooking targets.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-2 rounded-xl border border-white/20 text-white">
            <Calendar className="w-4 h-4 text-amber-200" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={fetchCookingCount}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-50 text-xs font-extrabold shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-right text-xs text-slate-400 mb-4 flex items-center justify-end gap-1">
          <Clock className="w-3.5 h-3.5" />
          Last updated: {lastUpdated}
        </div>
      )}

      {/* Grand Total Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-md">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              Total Production For {date}
            </div>
            <div className="text-3xl font-black text-slate-900">
              {data?.grand_total ?? 0}{' '}
              <span className="text-sm font-semibold text-slate-500">Meals to Cook</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Active Take Orders Only (Skip Orders Deducted)</span>
        </div>
      </div>

      {/* Slots Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {slots.map((slotKey) => {
          const breakdown: SlotCountBreakdown = data?.slots?.[slotKey] || {
            total: 0,
            veg: 0,
            non_veg: 0,
            egg: 0,
            skipped: 0,
          };

          return (
            <div
              key={slotKey}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    {getSlotIcon(slotKey)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 capitalize text-base">
                      {slotKey}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Batch Requirement</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900">{breakdown.total}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Meals</div>
                </div>
              </div>

              {/* Diet Breakdown List */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Vegetarian (Veg)
                  </span>
                  <span className="font-black text-emerald-800 text-sm">{breakdown.veg}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 border border-red-100 text-xs">
                  <span className="font-bold text-red-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    Non-Vegetarian (Meat/Poultry)
                  </span>
                  <span className="font-black text-red-800 text-sm">{breakdown.non_veg}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Eggitarian (Egg Dishes)
                  </span>
                  <span className="font-black text-amber-800 text-sm">{breakdown.egg}</span>
                </div>
              </div>

              {/* Skipped Notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Skips:</span>
                </div>
                <span className="font-bold text-slate-700">{breakdown.skipped} Skipped</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Planned Menu Items for that Day */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          Recipes & Planned Dishes for {date}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Menu catalog registered for this preparation date.
        </p>

        {(!data?.menu_items || data.menu_items.length === 0) ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No recipes logged in system for this date.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.menu_items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400 mb-1">
                    {getSlotIcon(item.meal_slot)}
                    {item.meal_slot}
                  </div>
                  <div className="font-bold text-sm text-slate-800">{item.item_name}</div>
                </div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    item.dietary_type === 'veg'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.dietary_type === 'non_veg'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.dietary_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
