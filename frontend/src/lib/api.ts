import { storage } from "@/src/utils/storage";
import * as Crypto from "expo-crypto";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const API = `${BASE}/api`;

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url?: string;
  active: boolean;
  category: string;
  pricing: "hourly" | "quote";
  min_hours: number;
  icon: string;
};

export type Profile = {
  name: string;
  phone: string;
  email: string;
  address: string;
  materials_by_us: boolean;
};

export type Booking = {
  id: string;
  device_id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  service_id: string;
  service_name: string;
  service_price: number;
  address: string;
  address_notes?: string;
  latitude?: number;
  longitude?: number;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
  status: string;
  payment_ref?: string;
  paid_at?: string | null;
  created_at: string;
  discount_code?: string | null;
  discount_amount?: number;
  final_price?: number;
  service_category?: string;
  pricing?: "hourly" | "quote";
  hours?: number | null;
  hourly_rate?: number | null;
  materials_by_us?: boolean;
  materials_fee?: number;
  invoice_number?: string | null;
  feedback_done?: boolean;
  quote_note?: string | null;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string;
  referral_code: string;
  loyalty_count: number;
  created_at: string;
};

export type Coupon = {
  code: string;
  discount_percent: number;
  reason: string;
  used: boolean;
  expires_at: string;
  created_at: string;
  description: string;
};

export const PAID_STATUSES = ["paid", "confirmed", "in_progress", "completed"];
export const LOYALTY_THRESHOLD = 5;

export function isInvoiceable(b: Booking) {
  return PAID_STATUSES.includes(b.status) && b.pricing !== "quote" && !!b.payment_ref && (b.final_price ?? 0) > 0;
}

export function invoiceUrl(bookingId: string, deviceId: string) {
  return `${API}/bookings/${bookingId}/invoice?device_id=${encodeURIComponent(deviceId)}`;
}

export const CUSTOMER_TOKEN_KEY = "customer_token";
export async function getCustomerToken(): Promise<string> {
  return (await storage.secureGet<string>(CUSTOMER_TOKEN_KEY, "")) || "";
}
export async function setCustomerToken(t: string | null) {
  if (t) await storage.secureSet(CUSTOMER_TOKEN_KEY, t);
  else await storage.secureRemove(CUSTOMER_TOKEN_KEY);
}

type ReqOpts = { method?: string; body?: string; adminAuth?: boolean; customerAuth?: boolean; deviceId?: string };

async function jsonReq<T>(path: string, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.adminAuth) {
    const token = await storage.secureGet<string>("admin_token", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (opts.customerAuth) {
    const token = await getCustomerToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (opts.deviceId) headers["X-Device-Id"] = opts.deviceId;
  const res = await fetch(`${API}${path}`, { method: opts.method, body: opts.body, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = (data && data.detail) || `HTTP ${res.status}`;
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  listServices: () => jsonReq<Service[]>("/services"),
  settings: () => jsonReq<{ materials_fee: number }>("/settings"),

  createBooking: (payload: any) =>
    jsonReq<Booking>("/bookings", { method: "POST", body: JSON.stringify(payload), customerAuth: true }),
  payBooking: (id: string, payload: any, deviceId: string) =>
    jsonReq<Booking>(`/bookings/${id}/pay`, { method: "POST", body: JSON.stringify(payload), deviceId, customerAuth: true }),
  getBooking: (id: string, deviceId: string) =>
    jsonReq<Booking>(`/bookings/${id}`, { deviceId, customerAuth: true }),
  customerBookings: (deviceId: string) =>
    jsonReq<Booking[]>(`/bookings/customer/${encodeURIComponent(deviceId)}`, { deviceId }),
  myBookings: () => jsonReq<Booking[]>("/bookings/me", { customerAuth: true }),

  validateDiscount: (code: string, price: number) =>
    jsonReq<{ code: string; type: string; value: number; description: string; discount_amount: number; final_price: number }>(
      "/discount/validate",
      { method: "POST", body: JSON.stringify({ code, price }), customerAuth: true },
    ),

  getProfile: (deviceId: string) => jsonReq<Profile>("/profile", { deviceId }),
  saveProfile: (p: Profile, deviceId: string) =>
    jsonReq<Profile>("/profile", { method: "PUT", body: JSON.stringify(p), deviceId }),

  // Customer auth
  register: (payload: { email: string; password: string; name: string; phone?: string; referral_code?: string }) =>
    jsonReq<{ access_token: string; customer: Customer }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (email: string, password: string) =>
    jsonReq<{ access_token: string; customer: Customer }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => jsonReq<Customer>("/auth/me", { customerAuth: true }),
  updateMe: (patch: Partial<{ name: string; phone: string; address: string; materials_by_us: boolean }>) =>
    jsonReq<Customer>("/auth/me", { method: "PUT", body: JSON.stringify(patch), customerAuth: true }),
  changePassword: (current_password: string, new_password: string) =>
    jsonReq<void>("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }), customerAuth: true }),
  forgotPassword: (email: string) =>
    jsonReq<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    jsonReq<void>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }),
  myCoupons: () => jsonReq<Coupon[]>("/coupons/me", { customerAuth: true }),

  // Feedback (public)
  feedbackInfo: (token: string) =>
    jsonReq<{ service_name: string; scheduled_date: string; scheduled_time: string; feedback_done: boolean }>(`/feedback/${encodeURIComponent(token)}`),
  submitFeedback: (token: string, payload: { rating: number; clarity: number; would_recommend: boolean; comment?: string }) =>
    jsonReq<{ ok: boolean; coupon_code: string; discount_percent: number }>(`/feedback/${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(payload) }),

  // admin
  updateSettings: (materials_fee: number) =>
    jsonReq<{ materials_fee: number }>("/admin/settings", { method: "PUT", body: JSON.stringify({ materials_fee }), adminAuth: true }),
  adminLogin: (email: string, password: string) =>
    jsonReq<{ access_token: string; email: string }>("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  adminBookings: (params?: { date?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set("date", params.date);
    if (params?.status) q.set("status", params.status);
    const s = q.toString();
    return jsonReq<Booking[]>(`/admin/bookings${s ? `?${s}` : ""}`, { adminAuth: true });
  },
  adminStats: () =>
    jsonReq<{ total_bookings: number; today_bookings: number; paid_bookings: number; revenue: number }>("/admin/stats", { adminAuth: true }),
  updateStatus: (id: string, status: string) =>
    jsonReq<Booking>(`/admin/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), adminAuth: true }),
  sendQuote: (id: string, payload: { price?: number; hourly_rate?: number; hours?: number; materials_fee?: number; note?: string }) =>
    jsonReq<Booking>(`/admin/bookings/${id}/quote`, { method: "PATCH", body: JSON.stringify(payload), adminAuth: true }),
  adminListServices: () => jsonReq<Service[]>("/admin/services", { adminAuth: true }),
  createService: (payload: any) =>
    jsonReq<Service>("/admin/services", { method: "POST", body: JSON.stringify(payload), adminAuth: true }),
  updateService: (id: string, payload: any) =>
    jsonReq<Service>(`/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(payload), adminAuth: true }),
  deleteService: (id: string) =>
    jsonReq<{ ok: boolean }>(`/admin/services/${id}`, { method: "DELETE", adminAuth: true }),
};

// device id helpers — uses crypto-strong UUID
export async function getDeviceId(): Promise<string> {
  let id = await storage.getItem<string>("device_id", "");
  if (!id) {
    try {
      id = Crypto.randomUUID();
    } catch {
      const buf = await Crypto.getRandomBytesAsync(16);
      id = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    await storage.setItem("device_id", id);
  }
  return id;
}
