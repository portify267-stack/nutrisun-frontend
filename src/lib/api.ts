import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inject JWT token if available in localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nutrisun_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // If unauthorized, could clear token if not on login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        localStorage.removeItem('nutrisun_token');
        localStorage.removeItem('nutrisun_user');
      }
    }
    return Promise.reject(error);
  }
);

// TypeScript Models matching Golang backend contracts
export type Role = 'customer' | 'admin' | 'chef' | 'delivery';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type DietaryType = 'veg' | 'non_veg' | 'egg';
export type MealStatus = 'TAKE' | 'SKIP';
export type DeliveryStatus = 'PENDING' | 'DELIVERED';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  created_at?: string;
}

export interface Address {
  id: number;
  user_id: number;
  address_type: string;
  address_line: string;
  area: string;
  landmark?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerPreference {
  id: number;
  user_id: number;
  breakfast_address_id?: number | null;
  lunch_address_id?: number | null;
  dinner_address_id?: number | null;
  breakfast_address?: Address | null;
  lunch_address?: Address | null;
  dinner_address?: Address | null;
}

export interface MenuItem {
  id: number;
  date: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  item_name: string;
  dietary_type: DietaryType;
  created_at?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  days_count: number;
  price: number;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  payment_status: PaymentStatus;
  is_active: boolean;
  user?: User;
  plan?: SubscriptionPlan;
}

export interface DailyMealLog {
  id: number;
  subscription_id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  dietary_type: DietaryType;
  status: MealStatus;
  delivery_status: DeliveryStatus;
  subscription?: UserSubscription;
}

export interface SlotCountBreakdown {
  total: number;
  veg: number;
  non_veg: number;
  egg: number;
  skipped: number;
}

export interface KitchenCountResponse {
  date: string;
  slots: Record<string, SlotCountBreakdown>;
  grand_total: number;
  menu_items: MenuItem[];
}

export interface DeliveryEntry {
  meal_log_id: number;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  meal_slot: MealSlot;
  dietary_type: DietaryType;
  meal_status: MealStatus;
  delivery_status: DeliveryStatus;
  address_id?: number | null;
  address_type?: string;
  address_line?: string;
  area?: string;
  landmark?: string;
}

export interface DeliverySheetResponse {
  date: string;
  slot: MealSlot;
  total_meals: number;
  deliveries: DeliveryEntry[];
  grouped_by_area: Record<string, DeliveryEntry[]>;
}

export interface SubscriptionItemResponse {
  id: number;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  plan_id: number;
  plan_name: string;
  plan_price: number;
  days_count: number;
  start_date: string;
  end_date: string;
  payment_status: PaymentStatus;
  payment_badge: string;
  is_active: boolean;
  created_at: string;
}

// Typed API Helpers
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string; role?: Role }) =>
    api.post<{ message: string; token: string; user: User }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ message: string; token: string; user: User }>('/auth/login', data),
};

export const customerApi = {
  getAddresses: () =>
    api.get<{ addresses: Address[]; preferences: { breakfast_address_id?: number; lunch_address_id?: number; dinner_address_id?: number } }>('/customer/addresses'),
  addAddress: (data: { address_type: string; address_line: string; area: string; landmark?: string }) =>
    api.post<{ message: string; address: Address }>('/customer/addresses', data),
  updateSlotAddresses: (data: { breakfast_address_id?: number | null; lunch_address_id?: number | null; dinner_address_id?: number | null }) =>
    api.put<{ message: string; preferences: CustomerPreference }>('/customer/slot-addresses', data),
  getMyMeals: (params?: { date?: string; month?: string; year?: string }) =>
    api.get<{ count: number; meals: DailyMealLog[] }>('/customer/my-meals', { params }),
  toggleMealStatus: (id: number) =>
    api.put<{ message: string; meal: DailyMealLog }>(`/customer/meals/${id}/toggle`),
};

export const menuApi = {
  getMenu: (params?: { month?: string; year?: string }) =>
    api.get<{ month: string; year: string; count: number; menu: MenuItem[] }>('/menu', { params }),
};

export const kitchenApi = {
  getTodayCount: (date?: string) =>
    api.get<KitchenCountResponse>('/kitchen/today-count', { params: date ? { date } : {} }),
};

export const deliveryApi = {
  getSheet: (params: { date?: string; slot?: MealSlot }) =>
    api.get<DeliverySheetResponse>('/delivery/sheet', { params }),
  updateStatus: (id: number, data?: { delivery_status: DeliveryStatus }) =>
    api.put<{ message: string; meal_log_id: number; delivery_status: DeliveryStatus }>(`/delivery/${id}/status`, data || {}),
};

export const adminApi = {
  createMenuItem: (data: { date: string; meal_slot: MealSlot; item_name: string; dietary_type: DietaryType }) =>
    api.post<{ message: string; item: MenuItem }>('/admin/menu', data),
  deleteMenuItem: (id: number) =>
    api.delete<{ message: string; id: number }>(`/admin/menu/${id}`),
  getSubscriptions: () =>
    api.get<{ count: number; subscriptions: SubscriptionItemResponse[] }>('/admin/subscriptions'),
  markPaymentPaid: (id: number) =>
    api.put<{ message: string; subscription: UserSubscription; payment_status: PaymentStatus }>(`/admin/subscriptions/${id}/payment`),
  createSubscription: (data: { user_id: number; plan_id: number; start_date: string; payment_status?: string }) =>
    api.post<{ message: string; subscription: UserSubscription }>('/admin/subscriptions', data),
  getPlans: () =>
    api.get<{ plans: SubscriptionPlan[] }>('/admin/plans'),
  createPlan: (data: { name: string; days_count: number; price: number }) =>
    api.post<{ message: string; plan: SubscriptionPlan }>('/admin/plans', data),
};
