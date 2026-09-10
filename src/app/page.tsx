'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { menuApi, adminApi, MenuItem, SubscriptionPlan, MealSlot } from '@/lib/api';
import {
  Sun,
  UtensilsCrossed,
  Sparkles,
  HeartHandshake,
  ChefHat,
  Truck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Coffee,
  Utensils,
  Moon,
  Calendar,
  Clock,
  Flame,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSlot, setActiveSlot] = useState<MealSlot>('breakfast');

  useEffect(() => {
    // Load public menu
    menuApi
      .getMenu({ month: '09', year: '2026' })
      .then((res) => setMenuItems(res.data.menu || []))
      .catch((e) => console.error('Error loading menu:', e));

    // Load plans
    adminApi
      .getPlans()
      .then((res) => setPlans(res.data.plans || []))
      .catch((e) => console.error('Error loading plans:', e));
  }, []);

  const slotFilteredMenu = menuItems.filter((i) => i.meal_slot === activeSlot);

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

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-slate-50 pt-16 sm:pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            NutriSun Automated Nutrition System
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Wholesome Daily Meals,{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 bg-clip-text text-transparent">
              Engineered for Your Schedule.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Subscribe to fresh chef-crafted nutrition. Toggle single-click <strong>TAKE / SKIP</strong>, route breakfast to home and lunch to your office, and sync live with our commercial kitchen.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {user ? (
              <Link
                href={
                  user.role === 'admin'
                    ? '/dashboard/admin'
                    : user.role === 'chef'
                    ? '/dashboard/chef'
                    : user.role === 'delivery'
                    ? '/dashboard/delivery'
                    : '/dashboard/customer'
                }
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 hover:shadow-lg transition-all flex items-center gap-2"
              >
                Go to {user.role.toUpperCase()} Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 hover:shadow-lg transition-all flex items-center gap-2"
                >
                  Start Your Meal Plan
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-sm border border-slate-200 shadow-xs transition-all"
                >
                  Sign In to Dashboard
                </Link>
              </>
            )}
          </div>

          {/* Role Quick Cards Preview */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <Link
              href="/dashboard/customer"
              className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-emerald-100 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900">Customer</div>
              <div className="text-xs text-slate-500 mt-0.5">Take/Skip & multi-address slot routing</div>
            </Link>

            <Link
              href="/dashboard/chef"
              className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-amber-100 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ChefHat className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900">Kitchen Head</div>
              <div className="text-xs text-slate-500 mt-0.5">Real-time cook counts with skips deducted</div>
            </Link>

            <Link
              href="/dashboard/delivery"
              className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-blue-100 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Truck className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900">Delivery Rider</div>
              <div className="text-xs text-slate-500 mt-0.5">Area run-sheet & mark as delivered</div>
            </Link>

            <Link
              href="/dashboard/admin"
              className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900">Admin Team</div>
              <div className="text-xs text-slate-500 mt-0.5">Payment approvals & recipe catalog</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Menu Showcase Section */}
      <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-emerald-700 tracking-wider mb-2">
            <UtensilsCrossed className="w-4 h-4" />
            Nutritional Dish Lineup
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Today&apos;s Fresh Prep & Recipes
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Carefully curated macro-balanced ingredients prepared daily by executive chefs.
          </p>

          {/* Slot Tabs */}
          <div className="mt-6 inline-flex items-center p-1 bg-slate-100 rounded-xl">
            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((slot) => {
              const active = activeSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    active ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {getSlotIcon(slot)}
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Cards */}
        {slotFilteredMenu.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            No recipes listed for {activeSlot} in this cycle. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {slotFilteredMenu.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
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
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {item.item_name}
                  </h3>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize font-semibold text-emerald-700 flex items-center gap-1">
                    {getSlotIcon(item.meal_slot)}
                    {item.meal_slot} Slot
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">Fresh Daily Delivery</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subscription Plans Section */}
      <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-amber-700 tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            Simple Transparent Pricing
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Subscription Packages
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose a recurring plan with automatic meal scheduling and pause protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => {
            const isFeatured = idx === 1 || plan.days_count === 30;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 border flex flex-col justify-between transition-all ${
                  isFeatured
                    ? 'bg-gradient-to-b from-emerald-900 to-slate-900 text-white border-emerald-700 shadow-xl shadow-emerald-900/20 md:-translate-y-2'
                    : 'bg-white text-slate-900 border-slate-200 shadow-sm'
                }`}
              >
                <div>
                  {isFeatured && (
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-amber-950 mb-4">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-black">{plan.name}</h3>
                  <p className={`text-xs mt-1 ${isFeatured ? 'text-emerald-200' : 'text-slate-500'}`}>
                    Continuous fresh meal delivery for {plan.days_count} consecutive days.
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-black">${plan.price}</span>
                    <span className={`text-xs ${isFeatured ? 'text-slate-300' : 'text-slate-500'}`}>
                      / {plan.days_count} days
                    </span>
                  </div>

                  <ul className="mt-8 space-y-3 text-xs">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isFeatured ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>3 Meals Daily (Breakfast, Lunch, Dinner)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isFeatured ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>Single-Click Take / Skip Anytime</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isFeatured ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>Split Routing: Home & Office</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isFeatured ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>Chef Prepared & Doorstep Delivery</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    href="/register"
                    className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                      isFeatured
                        ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    Subscribe Now
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
