import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API, formatApiError } from "@/lib/api";
import { Logo } from "@/components/site/Header";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem("cs_admin_token", data.token);
      nav("/admin");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF7E4] via-white to-[#E6F0FA] flex items-center justify-center px-5">
      <form onSubmit={submit} className="rise w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6" data-testid="admin-login-form">
        <Logo />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Lock className="h-5 w-5 text-[#1170C4]" />Admin-Bereich</h1>
          <p className="text-sm text-slate-500 mt-1">Melden Sie sich an, um Kontaktanfragen zu verwalten.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ae">E-Mail</Label>
          <Input id="ae" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" data-testid="admin-login-email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ap">Passwort</Label>
          <Input id="ap" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" data-testid="admin-login-password" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2" data-testid="admin-login-error">{error}</p>}
        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1170C4] hover:bg-[#0D5CA3] text-white font-semibold py-3.5 transition-colors disabled:opacity-60" data-testid="admin-login-submit">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Anmelden
        </button>
      </form>
    </div>
  );
}
