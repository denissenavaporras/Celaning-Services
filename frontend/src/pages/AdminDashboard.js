import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { LogOut, Phone, Mail, Trash2, Inbox, MailCheck, MailX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, authHeaders } from "@/lib/api";
import { Logo } from "@/components/site/Header";

const STATUS = { neu: "Neu", in_bearbeitung: "In Bearbeitung", erledigt: "Erledigt" };
const STATUS_CLS = { neu: "bg-sky-100 text-sky-800", in_bearbeitung: "bg-amber-100 text-amber-800", erledigt: "bg-emerald-100 text-emerald-800" };
const FILTERS = ["alle", "neu", "in_bearbeitung", "erledigt"];

const Row = ({ c, onStatus, onDelete }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 grid md:grid-cols-12 gap-4" data-testid={`admin-contact-${c.id}`}>
    <div className="md:col-span-4 space-y-1">
      <p className="font-semibold text-slate-900">{c.name}</p>
      <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-[#0D5CA3] hover:underline"><Phone className="h-3.5 w-3.5" />{c.phone}</a>
      <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-[#0D5CA3] hover:underline break-all"><Mail className="h-3.5 w-3.5" />{c.email}</a>
      <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString("de-AT")}</p>
    </div>
    <div className="md:col-span-5 space-y-2">
      <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF7E4] text-[#1170C4]" data-testid={`admin-contact-service-${c.id}`}>{c.service}</span>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.message || "–"}</p>
      <p className="flex items-center gap-1.5 text-xs text-slate-400">{c.email_sent ? <MailCheck className="h-3.5 w-3.5 text-emerald-600" /> : <MailX className="h-3.5 w-3.5 text-red-500" />}{c.email_sent ? "E-Mail versendet" : "E-Mail nicht versendet"}</p>
    </div>
    <div className="md:col-span-3 flex md:flex-col gap-2 md:items-end">
      <Select value={c.status} onValueChange={(v) => onStatus(c.id, v)}>
        <SelectTrigger className={`w-44 rounded-full border-0 font-semibold ${STATUS_CLS[c.status]}`} data-testid={`admin-status-select-${c.id}`}><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
      </Select>
      <button onClick={() => onDelete(c.id)} className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 rounded-full px-3 py-2 transition-colors" data-testid={`admin-delete-${c.id}`}><Trash2 className="h-4 w-4" />Löschen</button>
    </div>
  </div>
);

export default function AdminDashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("alle");

  const handleErr = useCallback((e) => {
    if (e.response?.status === 401) { localStorage.removeItem("cs_admin_token"); nav("/admin/login"); }
    else toast.error("Aktion fehlgeschlagen");
  }, [nav]);

  const load = useCallback(() => {
    axios.get(`${API}/admin/contacts`, { headers: authHeaders() }).then((r) => setItems(r.data)).catch(handleErr);
  }, [handleErr]);

  useEffect(() => {
    if (!localStorage.getItem("cs_admin_token")) nav("/admin/login");
    else load();
  }, [load, nav]);

  const onStatus = (id, status) =>
    axios.patch(`${API}/admin/contacts/${id}`, { status }, { headers: authHeaders() })
      .then((r) => setItems((p) => p.map((c) => (c.id === id ? r.data : c)))).catch(handleErr);

  const onDelete = (id) => {
    if (!window.confirm("Anfrage wirklich löschen?")) return;
    axios.delete(`${API}/admin/contacts/${id}`, { headers: authHeaders() })
      .then(() => { setItems((p) => p.filter((c) => c.id !== id)); toast.success("Gelöscht"); }).catch(handleErr);
  };

  const logout = () => { localStorage.removeItem("cs_admin_token"); nav("/admin/login"); };
  const shown = (items || []).filter((c) => filter === "alle" || c.status === filter);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 h-[72px] flex items-center justify-between">
          <Logo />
          <button onClick={logout} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-full px-4 py-2 hover:bg-slate-100" data-testid="admin-logout-button"><LogOut className="h-4 w-4" />Abmelden</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-10 space-y-6" data-testid="admin-dashboard">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kontaktanfragen</h1>
            <p className="text-slate-500 mt-1" data-testid="admin-contacts-count">{items ? `${items.length} Anfragen insgesamt` : "Lädt..."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} data-testid={`admin-filter-${f}`}
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${filter === f ? "bg-[#1170C4] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                {f === "alle" ? "Alle" : STATUS[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3" data-testid="admin-submissions-table">
          {items && shown.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-500" data-testid="admin-empty-state">
              <Inbox className="h-10 w-10 mx-auto mb-3 text-slate-300" />Keine Anfragen vorhanden.
            </div>
          )}
          {shown.map((c) => <Row key={c.id} c={c} onStatus={onStatus} onDelete={onDelete} />)}
        </div>
      </main>
    </div>
  );
}
