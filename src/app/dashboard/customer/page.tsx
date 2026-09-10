'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  customerApi,
  DailyMealLog,
  Address,
  MealSlot,
  CustomerPreference,
} from '@/lib/api';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  MapPin,
  Plus,
  RefreshCw,
  Clock,
  Home,
  Building2,
  Check,
  AlertCircle,
  Sliders,
  Sparkles,
  Coffee,
  Utensils,
  Moon,
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [meals, setMeals] = useState<DailyMealLog[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [preferences, setPreferences] = useState<CustomerPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Address Manager Modal/Form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrType, setNewAddrType] = useState('Home');
  const [newAddrLine, setNewAddrLine] = useState('');
  const [newAddrArea, setNewAddrArea] = useState('');
  const [newAddrLandmark, setNewAddrLandmark] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  // Slot Address Preferences state
  const [bfAddrId, setBfAddrId] = useState<number | ''>('');
  const [lunchAddrId, setLunchAddrId] = useState<number | ''>('');
  const [dinnerAddrId, setDinnerAddrId] = useState<number | ''>('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Month filter
  const [selectedMonth, setSelectedMonth] = useState('09');
  const [selectedYear, setSelectedYear] = useState('2026');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      // 1. Fetch meals
      const mealsRes = await customerApi.getMyMeals({
        month: selectedMonth,
        year: selectedYear,
      });
      setMeals(mealsRes.data.meals || []);

      // 2. Fetch addresses & preferences
      const addrRes = await customerApi.getAddresses();
      setAddresses(addrRes.data.addresses || []);
      const prefs = addrRes.data.preferences;
      if (prefs) {
        setPreferences(prefs as any);
        setBfAddrId(prefs.breakfast_address_id || '');
        setLunchAddrId(prefs.lunch_address_id || '');
        setDinnerAddrId(prefs.dinner_address_id || '');
      }
    } catch (err: any) {
      console.error('Failed to load customer data:', err);
      setStatusMessage('Error fetching meal schedule or addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedMonth, selectedYear]);

  // Handle single-click toggle
  const handleToggleMeal = async (mealId: number) => {
    setTogglingId(mealId);
    try {
      const res = await customerApi.toggleMealStatus(mealId);
      const updatedMeal = res.data.meal;
      setMeals((prev) =>
        prev.map((m) => (m.id === mealId ? { ...m, status: updatedMeal.status } : m))
      );
      setStatusMessage(`Meal status changed to ${updatedMeal.status}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Toggle failed:', err);
      alert('Failed to toggle meal status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Add Address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      const res = await customerApi.addAddress({
        address_type: newAddrType,
        address_line: newAddrLine,
        area: newAddrArea,
        landmark: newAddrLandmark,
      });
      setAddresses((prev) => [...prev, res.data.address]);
      setShowAddAddress(false);
      setNewAddrLine('');
      setNewAddrArea('');
      setNewAddrLandmark('');
      setStatusMessage('New address saved successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Address creation failed:', err);
      alert('Failed to save address.');
    } finally {
      setSavingAddr(false);
    }
  };

  // Handle Update Slot Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await customerApi.updateSlotAddresses({
        breakfast_address_id: bfAddrId ? Number(bfAddrId) : null,
        lunch_address_id: lunchAddrId ? Number(lunchAddrId) : null,
        dinner_address_id: dinnerAddrId ? Number(dinnerAddrId) : null,
      });
      setStatusMessage('Slot delivery addresses updated successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update slot addresses:', err);
      alert('Failed to update slot delivery preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const getSlotIcon = (slot: MealSlot) => {
    switch (slot) {
      case 'breakfast':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'lunch':
        return <Utensils className="w-4 h-4 text-emerald-500" />;
      case 'dinner':
        return <Moon className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getDietaryBadge = (type: string) => {
    switch (type) {
      case 'veg':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 rounded">VEG</span>;
      case 'non_veg':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-800 rounded">NON-VEG</span>;
      case 'egg':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 rounded">EGG</span>;
      default:
        return null;
    }
  };

  // Group meals by Date
  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) {
      acc[meal.date] = [];
    }
    acc[meal.date].push(meal);
    return acc;
  }, {} as Record<string, DailyMealLog[]>);

  const sortedDates = Object.keys(groupedMeals).sort();

  if (authLoading || (!user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading customer dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/50 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Customer Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Hi, {user?.name || 'Customer'}!
          </h1>
          <p className="text-sm text-emerald-100 mt-1 max-w-xl">
            Manage your daily meal deliveries, toggle take/skip status in real-time, and route breakfast, lunch, or dinner to separate addresses.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-3 rounded-2xl border border-white/10">
          <Calendar className="w-6 h-6 text-amber-300" />
          <div>
            <div className="text-xs text-emerald-200 uppercase font-semibold">Active Cycle</div>
            <div className="text-sm font-black text-white">September 2026</div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left = Schedule & Toggles, Right = Slot-based Address Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Meal Schedule & Toggle Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Daily Meal Calendar & Controls
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Single-click TAKE / SKIP to inform the kitchen and pause delivery.
                </p>
              </div>

              {/* Refresh / Filter */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Meals
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
                Loading your meal schedule...
              </div>
            ) : sortedDates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No active meal schedule found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Once your subscription is activated by admin, your daily meals will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {sortedDates.map((dateStr) => {
                  const dateMeals = groupedMeals[dateStr];
                  const dateObj = new Date(dateStr + 'T00:00:00');
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const displayDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={dateStr}
                      className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-sm">{dayName}, {displayDate}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({dateStr})</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {dateMeals.filter((m) => m.status === 'TAKE').length} of {dateMeals.length} TAKING
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {dateMeals.map((meal) => {
                          const isTaking = meal.status === 'TAKE';
                          const isToggling = togglingId === meal.id;

                          return (
                            <div
                              key={meal.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isTaking
                                  ? 'bg-white border-emerald-300 shadow-xs'
                                  : 'bg-slate-100 border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 font-bold text-xs capitalize text-slate-700">
                                  {getSlotIcon(meal.meal_slot)}
                                  {meal.meal_slot}
                                </div>
                                {getDietaryBadge(meal.dietary_type)}
                              </div>

                              <div className="text-[11px] text-slate-500 mb-3">
                                Delivery: <span className="font-semibold text-slate-700">{meal.delivery_status}</span>
                              </div>

                              {/* Single Click Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleMeal(meal.id)}
                                disabled={isToggling}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                                  isTaking
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                                }`}
                              >
                                {isToggling ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : isTaking ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    TAKING MEAL
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    SKIPPED
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Slot-based Address Manager */}
        <div className="space-y-6">
          {/* Slot Address Mapping Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Slot Delivery Routing
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Direct breakfast, lunch, and dinner to specific addresses (e.g. Home for Breakfast, Office for Lunch).
            </p>

            {addresses.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 mb-4">
                You have no addresses saved yet. Add your Home and Office addresses below to enable slot routing.
              </div>
            ) : (
              <form onSubmit={handleSavePreferences} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    Breakfast Delivery Address
                  </label>
                  <select
                    value={bfAddrId}
                    onChange={(e) => setBfAddrId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Default / First Address</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_type} - {addr.area} ({addr.address_line})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                    Lunch Delivery Address
                  </label>
                  <select
                    value={lunchAddrId}
                    onChange={(e) => setLunchAddrId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Default / First Address</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_type} - {addr.area} ({addr.address_line})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Dinner Delivery Address
                  </label>
                  <select
                    value={dinnerAddrId}
                    onChange={(e) => setDinnerAddrId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Default / First Address</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_type} - {addr.area} ({addr.address_line})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {savingPrefs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Delivery Routing
                </button>
              </form>
            )}
          </div>

          {/* Saved Addresses List & Add Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Saved Addresses
              </h2>
              <button
                type="button"
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>

            {showAddAddress && (
              <form onSubmit={handleAddAddress} className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800">Add New Delivery Location</div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Type</label>
                  <select
                    value={newAddrType}
                    onChange={(e) => setNewAddrType(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Gym / Other">Gym / Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Address Line</label>
                  <input
                    type="text"
                    required
                    value={newAddrLine}
                    onChange={(e) => setNewAddrLine(e.target.value)}
                    placeholder="Apt 4B, Sunflower Residency"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Area / Neighborhood</label>
                  <input
                    type="text"
                    required
                    value={newAddrArea}
                    onChange={(e) => setNewAddrArea(e.target.value)}
                    placeholder="Downtown / Financial District"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={newAddrLandmark}
                    onChange={(e) => setNewAddrLandmark(e.target.value)}
                    placeholder="Near Central Park / Metro Gate 2"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingAddr}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                  >
                    {savingAddr ? 'Saving...' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {addr.address_type === 'Home' ? (
                      <Home className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Building2 className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="font-bold text-xs text-slate-800">{addr.address_type}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                      {addr.area}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{addr.address_line}</p>
                  {addr.landmark && (
                    <p className="text-[11px] text-slate-400 mt-0.5 italic">Landmark: {addr.landmark}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
