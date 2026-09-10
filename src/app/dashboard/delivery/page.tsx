'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  deliveryApi,
  DeliverySheetResponse,
  DeliveryEntry,
  MealSlot,
} from '@/lib/api';
import {
  Truck,
  Calendar,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  Coffee,
  Utensils,
  Moon,
  Home,
  Building2,
} from 'lucide-react';

export default function DeliveryDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [sheet, setSheet] = useState<DeliverySheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'delivery' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchSheet = async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.getSheet({ date, slot });
      setSheet(res.data);
    } catch (err) {
      console.error('Failed to fetch delivery run-sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'delivery' || user.role === 'admin')) {
      fetchSheet();
    }
  }, [user, date, slot]);

  const handleUpdateStatus = async (mealLogId: number, currentStatus: string) => {
    setUpdatingId(mealLogId);
    const nextStatus = currentStatus === 'DELIVERED' ? 'PENDING' : 'DELIVERED';
    try {
      await deliveryApi.updateStatus(mealLogId, { delivery_status: nextStatus });
      // Update local state
      if (sheet) {
        const updatedDeliveries = sheet.deliveries.map((d) =>
          d.meal_log_id === mealLogId ? { ...d, delivery_status: nextStatus as any } : d
        );
        const updatedGrouped: Record<string, DeliveryEntry[]> = {};
        for (const d of updatedDeliveries) {
          const area = d.area || 'Unassigned Area';
          if (!updatedGrouped[area]) updatedGrouped[area] = [];
          updatedGrouped[area].push(d);
        }
        setSheet({
          ...sheet,
          deliveries: updatedDeliveries,
          grouped_by_area: updatedGrouped,
        });
      }
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      alert('Failed to update delivery status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  // Filter deliveries
  const allDeliveries = sheet?.deliveries || [];
  const filteredDeliveries = allDeliveries.filter((d) => {
    const matchesSearch =
      d.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.address_line?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer_phone?.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'ALL' || d.delivery_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Re-group filtered deliveries by area
  const filteredGrouped = filteredDeliveries.reduce((acc, d) => {
    const area = d.area || 'Unassigned Area';
    if (!acc[area]) acc[area] = [];
    acc[area].push(d);
    return acc;
  }, {} as Record<string, DeliveryEntry[]>);

  const deliveredCount = allDeliveries.filter((d) => d.delivery_status === 'DELIVERED').length;
  const pendingCount = allDeliveries.filter((d) => d.delivery_status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/50 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <Truck className="w-3.5 h-3.5 text-white" />
            Dispatch & Logistics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Delivery Run-Sheet
          </h1>
          <p className="text-sm text-blue-100 mt-1 max-w-xl">
            Area-grouped drop routes and live delivery tracking for {slot.toUpperCase()} on {date}.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-2 rounded-xl border border-white/20 text-white text-xs font-bold">
            <Calendar className="w-4 h-4 text-blue-200" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={fetchSheet}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-extrabold shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Slot Navigation Tabs & Progress */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Slot Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((s) => {
              const active = slot === s;
              return (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    active
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'breakfast' && <Coffee className="w-3.5 h-3.5 text-amber-500" />}
                  {s === 'lunch' && <Utensils className="w-3.5 h-3.5 text-emerald-500" />}
                  {s === 'dinner' && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                  {s}
                </button>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-slate-500">
              Total: <strong className="text-slate-900 text-sm">{allDeliveries.length}</strong>
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Delivered: {deliveredCount}
            </span>
            <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Pending: {pendingCount}
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, address, phone, area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['ALL', 'PENDING', 'DELIVERED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deliveries Grouped by Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          Loading delivery run-sheet...
        </div>
      ) : Object.keys(filteredGrouped).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm text-slate-500">
          <Truck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No deliveries for this slot</h3>
          <p className="text-xs text-slate-400 mt-1">
            Either no meals are scheduled or all customers have skipped meals for this date & slot.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(filteredGrouped).map(([area, items]) => (
            <div key={area} className="space-y-3">
              {/* Area Header */}
              <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2 font-black text-sm text-slate-800">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  {area}
                </div>
                <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                  {items.length} {items.length === 1 ? 'Drop' : 'Drops'}
                </span>
              </div>

              {/* Delivery Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((delivery) => {
                  const isDelivered = delivery.delivery_status === 'DELIVERED';
                  const isUpdating = updatingId === delivery.meal_log_id;

                  return (
                    <div
                      key={delivery.meal_log_id}
                      className={`rounded-2xl p-5 border transition-all ${
                        isDelivered
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200 shadow-sm hover:shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="font-black text-sm text-slate-900">
                            {delivery.customer_name || 'Customer'}
                          </div>
                          {delivery.customer_phone ? (
                            <a
                              href={`tel:${delivery.customer_phone}`}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              {delivery.customer_phone}
                            </a>
                          ) : (
                            <div className="text-xs text-slate-400">No phone listed</div>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            delivery.dietary_type === 'veg'
                              ? 'bg-emerald-100 text-emerald-800'
                              : delivery.dietary_type === 'non_veg'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {delivery.dietary_type}
                        </span>
                      </div>

                      {/* Address Box */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 mb-4 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          {delivery.address_type === 'Home' ? (
                            <Home className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{delivery.address_type || 'Address'}</span>
                        </div>
                        <p className="text-slate-600 leading-snug">{delivery.address_line}</p>
                        {delivery.landmark && (
                          <p className="text-[11px] text-slate-400 italic">
                            Landmark: {delivery.landmark}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() =>
                          handleUpdateStatus(delivery.meal_log_id, delivery.delivery_status)
                        }
                        disabled={isUpdating}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          isDelivered
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isDelivered ? (
                          <>
                            <Check className="w-4 h-4" />
                            DELIVERED (Click to Undo)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            MARK AS DELIVERED
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
