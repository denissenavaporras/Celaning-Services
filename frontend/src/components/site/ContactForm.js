import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, formatApiError } from "@/lib/api";
import { SERVICE_OPTIONS } from "@/lib/content";

const EMPTY = { name: "", phone: "", email: "", service: "", message: "", offer: "" };
const field = "h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-[#5FA52E]/40";
const VALID = SERVICE_OPTIONS.map((o) => o.value);

export const ContactForm = () => {
  const [params] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const leistung = params.get("leistung");
    const angebot = params.get("angebot");
    if (!leistung && !angebot) return;
    setDone(false);
    setForm((f) => ({ ...f, service: VALID.includes(leistung) ? leistung : f.service, offer: (angebot || "").slice(0, 200) }));
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.service) return toast.error("Bitte wählen Sie eine Leistung aus.");
    setLoading(true);
    try {
      await axios.post(`${API}/contact`, form);
      setDone(true);
      setForm(EMPTY);
      toast.success("Vielen Dank! Ihre Anfrage wurde gesendet.");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
    setLoading(false);
  };

  if (done)
    return (
      <div className="text-center py-12 space-y-4" data-testid="contact-success">
        <CheckCircle2 className="h-14 w-14 text-[#5FA52E] mx-auto" />
        <h3 className="text-2xl font-bold text-slate-900">Vielen Dank für Ihre Anfrage!</h3>
        <p className="text-slate-600">Wir melden uns so schnell wie möglich bei Ihnen.</p>
        <button onClick={() => setDone(false)} className="text-sm font-semibold text-[#1170C4] hover:underline" data-testid="contact-new-request">Weitere Anfrage senden</button>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="contact-form">
      {form.offer && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-[#7DC242] bg-[#EEF7E4] px-4 py-3" data-testid="contact-selected-offer">
          <Tag className="h-4 w-4 mt-0.5 text-[#3F7A1C] shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-[#1E2F6B]">Gewähltes Angebot</p>
            <p className="text-slate-700" data-testid="contact-selected-offer-text">{form.offer}</p>
            <p className="text-xs text-slate-500 mt-0.5">Einführungspreis gültig vom 15.11. bis 15.12.2026</p>
          </div>
          <button type="button" onClick={() => setForm({ ...form, offer: "" })} aria-label="Angebot entfernen" data-testid="contact-remove-offer" className="p-1 rounded-full hover:bg-white text-slate-500"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" required value={form.name} onChange={set("name")} className={field} data-testid="contact-input-name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon *</Label>
          <Input id="phone" type="tel" required value={form.phone} onChange={set("phone")} className={field} data-testid="contact-input-phone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" required value={form.email} onChange={set("email")} className={field} data-testid="contact-input-email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Welche Leistung benötigen Sie? *</Label>
        <Select value={form.service} onValueChange={(v) => v && setForm((f) => ({ ...f, service: v }))}>
          <SelectTrigger className={field} data-testid="contact-select-service"><SelectValue placeholder="Bitte auswählen">{SERVICE_OPTIONS.find((o) => o.value === form.service)?.label}</SelectValue></SelectTrigger>
          <SelectContent>
            {SERVICE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} data-testid={`contact-service-option-${o.value.toLowerCase()}`}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Nachricht / Details</Label>
        <Textarea id="message" rows={5} value={form.message} onChange={set("message")} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-[#5FA52E]/40" placeholder="z. B. Wohnungsgröße, gewünschter Termin, Adresse..." data-testid="contact-input-message" />
      </div>
      <button type="submit" disabled={loading} data-testid="contact-submit-button"
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1170C4] hover:bg-[#0D5CA3] disabled:opacity-60 text-white font-semibold px-7 py-4 transition-colors">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Anfrage absenden
      </button>
      <p className="text-xs text-slate-500">Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten gemäß unserer Datenschutzerklärung zu.</p>
    </form>
  );
};
