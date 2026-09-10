'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  menuApi,
  SubscriptionItemResponse,
  SubscriptionPlan,
  MenuItem,
  MealSlot,
  DietaryType,
} from '@/lib/api';
import {
  ShieldCheck,
  CreditCard,
  UtensilsCrossed,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
  Calendar,
  Layers,
  DollarSign,
  UserCheck,
  Check,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Active tab: 'subscriptions' | 'menu' | 'plans'
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'menu' | 'plans'>('subscriptions');

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<SubscriptionItemResponse[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // Menu planner state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuMonth, setMenuMonth] = useState('09');
  const [menuYear, setMenuYear] = useState('2026');

  // New Menu Item Form
  const [newItemDate, setNewItemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newItemSlot, setNewItemSlot] = useState<MealSlot>('lunch');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDiet, setNewItemDiet] = useState<DietaryType>('veg');
  const [addingMenu, setAddingMenu] = useState(false);

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState(30);
  const [newPlanPrice, setNewPlanPrice] = useState(179);
  const [addingPlan, setAddingPlan] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load Subscriptions
  const fetchSubscriptions = async () => {
    setLoadingSubs(true);
    try {
      const res = await adminApi.getSubscriptions();
      setSubscriptions(res.data.subscriptions || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Load Menu
  const fetchMenu = async () => {
    setLoadingMenu(true);
    try {
      const res = await menuApi.getMenu({ month: menuMonth, year: menuYear });
      setMenuItems(res.data.menu || []);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Load Plans
  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await adminApi.getPlans();
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'subscriptions') fetchSubscriptions();
      if (activeTab === 'menu') fetchMenu();
      if (activeTab === 'plans') fetchPlans();
    }
  }, [user, activeTab, menuMonth, menuYear]);

  // Mark Payment as PAID
  const handleMarkPaymentPaid = async (subId: number) => {
    setMarkingId(subId);
    try {
      const res = await adminApi.markPaymentPaid(subId);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                payment_status: 'PAID',
                payment_badge: 'badge-success',
              }
            : s
        )
      );
      setNotification(`Subscription #${subId} marked as PAID. 21 Meal logs generated!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to mark payment as paid:', err);
      alert('Failed to update payment status.');
    } finally {
      setMarkingId(null);
    }
  };

  // Create Menu Item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMenu(true);
    try {
      const res = await adminApi.createMenuItem({
        date: newItemDate,
        meal_slot: newItemSlot,
        item_name: newItemName,
        dietary_type: newItemDiet,
      });
      setMenuItems((prev) => [...prev, res.data.item]);
      setNewItemName('');
      setNotification(`Recipe "${res.data.item.item_name}" added to menu catalog!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to add dish:', err);
      alert('Failed to create menu item.');
    } finally {
      setAddingMenu(false);
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = async (id: number) => {
    if (!confirm('Are you sure you want to remove this recipe from the menu?')) return;
    try {
      await adminApi.deleteMenuItem(id);
      setMenuItems((prev) => prev.filter((item) => item.id !== id));
      setNotification('Menu item deleted successfully.');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item.');
    }
  };

  // Create Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingPlan(true);
    try {
      const res = await adminApi.createPlan({
        name: newPlanName,
        days_count: Number(newPlanDays),
        price: Number(newPlanPrice),
      });
      setPlans((prev) => [...prev, res.data.plan]);
      setNewPlanName('');
      setNotification(`Subscription Plan "${res.data.plan.name}" created!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to add plan:', err);
      alert('Failed to create subscription plan.');
    } finally {
      setAddingPlan(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-900/10 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/50 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            Executive Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            NutriSun Admin Center
          </h1>
          <p className="text-sm text-purple-100 mt-1 max-w-xl">
            Approve subscriptions, trigger automatic meal log generation, manage pricing tiers, and curate daily menus.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/10 backdrop-blur p-1 rounded-2xl border border-white/20 text-xs font-bold">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-white text-purple-900 shadow-sm'
                : 'text-purple-100 hover:text-white'
            }`}
          >
            Subscriptions & Payments
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'menu'
                ? 'bg-white text-purple-900 shadow-sm'
                : 'text-purple-100 hover:text-white'
            }`}
          >
            Menu Planner
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'plans'
                ? 'bg-white text-purple-900 shadow-sm'
                : 'text-purple-100 hover:text-white'
            }`}
          >
            Plans & Pricing
          </button>
        </div>
      </div>

      {notification && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab 1: Subscriptions & Payment Approval */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Customer Subscriptions & Payment Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Approving a payment marks the subscription as PAID and auto-generates 21 daily meal records.
              </p>
            </div>

            <button
              onClick={fetchSubscriptions}
              disabled={loadingSubs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSubs ? 'animate-spin' : ''}`} />
              Refresh Subscriptions
            </button>
          </div>

          {loadingSubs ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
              Loading customer subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No subscriptions found in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px]">
                    <th className="py-3 px-4">Sub ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Validity</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {subscriptions.map((sub) => {
                    const isPaid = sub.payment_status === 'PAID';
                    const isProcessing = markingId === sub.id;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">#{sub.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{sub.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{sub.customer_email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            {sub.plan_name} (${sub.plan_price})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-mono text-[11px]">
                            {sub.start_date} &rarr; {sub.end_date}
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {sub.days_count} Days Total
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              PAID
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPaid ? (
                            <span className="text-xs font-semibold text-emerald-600">Active & Paid</span>
                          ) : (
                            <button
                              onClick={() => handleMarkPaymentPaid(sub.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 ml-auto text-xs"
                            >
                              {isProcessing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                              Mark as Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Menu Planner */}
      {activeTab === 'menu' && (
        <div className="space-y-8">
          {/* Add New Dish Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Add Recipe to Daily Menu
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Register nutritional recipes by calendar date and meal slot for kitchen prep and customer viewing.
            </p>

            <form onSubmit={handleCreateMenuItem} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Slot</label>
                <select
                  value={newItemSlot}
                  onChange={(e) => setNewItemSlot(e.target.value as MealSlot)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold capitalize"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dietary Type</label>
                <select
                  value={newItemDiet}
                  onChange={(e) => setNewItemDiet(e.target.value as DietaryType)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="veg">Vegetarian</option>
                  <option value="non_veg">Non-Vegetarian</option>
                  <option value="egg">Eggitarian</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quinoa Salad with Tofu"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingMenu}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 h-[38px]"
                >
                  {addingMenu ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Dish
                </button>
              </div>
            </form>
          </div>

          {/* Existing Menu Items */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-purple-600" />
                Active Menu Catalog ({menuMonth}/{menuYear})
              </h2>
              <button
                onClick={fetchMenu}
                disabled={loadingMenu}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMenu ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingMenu ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                Loading menu catalog...
              </div>
            ) : menuItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No recipes registered for {menuMonth}/{menuYear}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="capitalize text-slate-600">{item.meal_slot}</span>
                      </div>
                      <div className="font-bold text-xs text-slate-800">{item.item_name}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          item.dietary_type === 'veg'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.dietary_type === 'non_veg'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.dietary_type}
                      </span>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Subscription Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Create Plan Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Create New Subscription Plan
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Define pricing tiers and durations for customer onboarding.
            </p>

            <form onSubmit={handleCreatePlan} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14-Day Energy Detox"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Days Count</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newPlanDays}
                  onChange={(e) => setNewPlanDays(Number(e.target.value))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingPlan}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 h-[38px]"
                >
                  {addingPlan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Plan
                </button>
              </div>
            </form>
          </div>

          {/* Existing Plans */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Existing Subscription Packages
            </h2>

            {loadingPlans ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                Loading plans...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="text-xs font-bold uppercase text-purple-700 mb-1">#{p.id} Plan Tier</div>
                    <div className="text-lg font-black text-slate-900">{p.name}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-emerald-700">${p.price}</span>
                      <span className="text-xs text-slate-400">/ {p.days_count} Days</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
