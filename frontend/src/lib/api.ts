import { storage } from "@/src/utils/storage";

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
};

export type Booking = {
  id: string;
  device_id: string;
  customer_name: string;
  customer_phone: string;
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
};

async function jsonReq<T>(path: string, opts: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = await storage.secureGet<string>("admin_token", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return data as T;
}

export const api = {
  listServices: () => jsonReq<Service[]>("/services"),
  createBooking: (payload: any) =>
    jsonReq<Booking>("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  payBooking: (id: string, payload: any) =>
    jsonReq<Booking>(`/bookings/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
  getBooking: (id: string) => jsonReq<Booking>(`/bookings/${id}`),
  customerBookings: (deviceId: string) =>
    jsonReq<Booking[]>(`/bookings/customer/${encodeURIComponent(deviceId)}`),
  validateDiscount: (code: string, price: number) =>
    jsonReq<{ code: string; type: string; value: number; description: string; discount_amount: number; final_price: number }>(
      "/discount/validate",
      { method: "POST", body: JSON.stringify({ code, price }) },
    ),

  // admin
  adminLogin: (email: string, password: string) =>
    jsonReq<{ access_token: string; email: string }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  adminBookings: (params?: { date?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set("date", params.date);
    if (params?.status) q.set("status", params.status);
    const s = q.toString();
    return jsonReq<Booking[]>(`/admin/bookings${s ? `?${s}` : ""}`, {}, true);
  },
  adminStats: () =>
    jsonReq<{ total_bookings: number; today_bookings: number; paid_bookings: number; revenue: number }>(
      "/admin/stats",
      {},
      true,
    ),
  updateStatus: (id: string, status: string) =>
    jsonReq<Booking>(`/admin/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, true),
  adminListServices: () => jsonReq<Service[]>("/admin/services", {}, true),
  createService: (payload: any) =>
    jsonReq<Service>("/admin/services", { method: "POST", body: JSON.stringify(payload) }, true),
  updateService: (id: string, payload: any) =>
    jsonReq<Service>(`/admin/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true),
  deleteService: (id: string) =>
    jsonReq<{ ok: boolean }>(`/admin/services/${id}`, { method: "DELETE" }, true),
};

// device id helpers
export async function getDeviceId(): Promise<string> {
  let id = await storage.getItem<string>("device_id", "");
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await storage.setItem("device_id", id);
  }
  return id;
}
