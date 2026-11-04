import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, Customer, getCustomerToken, setCustomerToken } from "@/src/lib/api";

type Ctx = {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; name: string; phone?: string; referral_code?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getCustomerToken();
    if (!token) {
      setCustomer(null);
      return;
    }
    try {
      setCustomer(await api.me());
    } catch {
      await setCustomerToken(null);
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    await setCustomerToken(r.access_token);
    setCustomer(r.customer);
  }, []);

  const register = useCallback(async (payload: Parameters<typeof api.register>[0]) => {
    const r = await api.register(payload);
    await setCustomerToken(r.access_token);
    setCustomer(r.customer);
  }, []);

  const logout = useCallback(async () => {
    await setCustomerToken(null);
    setCustomer(null);
  }, []);

  return <AuthCtx.Provider value={{ customer, loading, login, register, logout, refresh }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
