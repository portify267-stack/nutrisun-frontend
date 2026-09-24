'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { deliveryApi, DeliverySheetResponse, MealSlot } from '@/lib/api';
import {
  Truck,
  Calendar,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Check,
  Coffee,
  Utensils,
  Moon,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';

export default function DeliveryDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<MealSlot>('breakfast');
  const [sheet, setSheet] = useState<DeliverySheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'delivery' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchSheet = async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.getSheet({ date, shift });
      setSheet(res.data);
      setFetchError(null);
    } catch (err: unknown) {
      console.error('Failed to fetch delivery run-sheet:', err);
      const apiErr = err as { response?: { data?: { error?: string } } };
      setFetchError(apiErr.response?.data?.error || 'Unable to connect to delivery run-sheet service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'delivery' || user.role === 'admin')) {
      fetchSheet();
    }
  }, [user?.id, user?.role, date, shift]);

  const handleMarkDelivered = async (mealLogId: number) => {
    setUpdatingId(mealLogId);
    try {
      const res = await deliveryApi.updateStatus(mealLogId);
      // Update local state immediately
      if (sheet) {
        const updated = sheet.deliveries.map((d) =>
          d.meal_log_id === mealLogId
            ? { ...d, delivery_status: 'DELIVERED' as const, delivered_at: res.data.delivered_at }
            : d
        );
        setSheet({
          ...sheet,
          deliveries: updated,
        });
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      alert(apiErr.response?.data?.error || 'Failed to mark as delivered.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getShiftIcon = (s: MealSlot) => {
    switch (s) {
      case 'breakfast':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'lunch':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'dinner':
        return <Moon className="w-4 h-4 text-indigo-500" />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[65vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#B92F25]" />
      </div>
    );
  }

  if (!user || (user.role !== 'delivery' && user.role !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 text-center px-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-xl font-black text-[#22222B]">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Delivery Fleet credentials required. Redirecting to sign in...
        </p>
      </div>
    );
  }

  const deliveries = sheet?.deliveries || [];
  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer_phone.includes(searchTerm);

    if (filterStatus === 'PENDING') return matchesSearch && d.delivery_status === 'PENDING';
    if (filterStatus === 'DELIVERED') return matchesSearch && d.delivery_status === 'DELIVERED';
    return matchesSearch;
  });

  const deliveredCount = deliveries.filter((d) => d.delivery_status === 'DELIVERED').length;
  const pendingCount = deliveries.filter((d) => d.delivery_status === 'PENDING').length;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#B92F25]/15 text-[#B92F25] font-bold text-[11px] uppercase tracking-wider">
              Logistics & Delivery Run-Sheet
            </span>
            <span className="text-xs text-slate-500">Field Delivery Interface</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 flex items-center gap-2 break-words">
            <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-[#741B22] shrink-0" />
            Doorstep Delivery Run-Sheet
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Fulfil customer meal drops. Marking delivered safely records completion and deducts 1 credit.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full md:w-auto">
          <div className="p-3 rounded-2xl bg-white/90 border border-[#B0BE8C]/35 text-center min-w-0 sm:min-w-[100px] shadow-xs flex-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Delivered</span>
            <div className="text-xl font-black text-emerald-700">{deliveredCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/90 border border-[#B0BE8C]/35 text-center min-w-0 sm:min-w-[100px] shadow-xs flex-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Remaining</span>
            <div className="text-xl font-black text-[#741B22]">{pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Date, Shift & Filters */}
      <div className="glass-card rounded-3xl p-4 sm:p-6 border border-[#B0BE8C]/35 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-[#B0BE8C] shrink-0" />
            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                Delivery Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>
          </div>

          {/* Shift selector buttons */}
          <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-2 p-1 rounded-2xl bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 w-full sm:w-auto">
            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((s) => (
              <button
                key={s}
                onClick={() => setShift(s)}
                className={`min-h-[44px] px-2.5 sm:px-4 py-2 rounded-xl text-xs font-black capitalize flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                  shift === s
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-xs border border-[#B0BE8C]'
                    : 'text-[#22222B]/75 hover:text-[#22222B] hover:bg-[#B0BE8C]/30'
                }`}
              >
                {getShiftIcon(s)}
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-3 border-t border-[#B0BE8C]/25">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer name, phone, or address..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
            />
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 p-1 rounded-xl text-xs font-bold">
            {(['ALL', 'PENDING', 'DELIVERED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`min-h-[44px] px-3 py-1 rounded-lg transition-all flex items-center justify-center ${
                  filterStatus === st
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-xs font-black'
                    : 'text-[#22222B]/70 hover:text-[#22222B]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-rose-300 bg-rose-50/70 text-center shadow-xs space-y-3">
          <div className="flex items-center justify-center gap-2 text-rose-800 font-bold">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchSheet}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center gap-2 shadow-xs transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Fetching Run-Sheet
          </button>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center text-slate-500 border border-[#B0BE8C]/35">
          <PackageCheck className="w-10 h-10 mx-auto text-[#B0BE8C] mb-2" />
          <p className="font-bold text-sm text-[#22222B]">No scheduled deliveries match your criteria.</p>
          <p className="text-xs text-slate-400 mt-0.5">Select a different date or shift above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map((item) => {
            const isDelivered = item.delivery_status === 'DELIVERED';
            const isUpdating = updatingId === item.meal_log_id;

            return (
              <div
                key={item.meal_log_id}
                className={`glass-card rounded-3xl p-4 sm:p-5 border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDelivered
                    ? 'bg-white/60 border-[#B0BE8C]/25 opacity-80'
                    : 'border-[#B0BE8C]/35 hover:border-[#B0BE8C]'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-[#22222B] break-words">{item.customer_name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 text-[10px] font-bold text-[#3F4D25] whitespace-nowrap">
                      Quantity: {item.quantity} Portion
                    </span>
                    {isDelivered && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                        <Check className="w-3 h-3" /> Delivered
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 text-xs text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-[#B92F25] shrink-0 mt-0.5" />
                    <span className="break-words">{item.delivery_address}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${item.customer_phone}`}
                      className="min-h-[44px] inline-flex items-center hover:underline font-bold text-[#741B22] hover:text-[#B92F25]"
                    >
                      {item.customer_phone}
                    </a>
                  </div>

                  {item.delivered_at && (
                    <div className="text-[10px] text-slate-400">
                      Completed at: {new Date(item.delivered_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-auto self-stretch sm:self-center">
                  <button
                    onClick={() => handleMarkDelivered(item.meal_log_id)}
                    disabled={isDelivered || isUpdating}
                    className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                      isDelivered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-[#B92F25] hover:bg-[#741B22] text-white shadow-md shadow-[#B92F25]/20 active:scale-95 disabled:opacity-50'
                    }`}
                  >
                    {isUpdating ? (
                      'Updating...'
                    ) : isDelivered ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Delivered</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="w-4 h-4" />
                        <span>Mark as Delivered</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
