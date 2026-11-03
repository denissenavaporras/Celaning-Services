import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, formatApiError } from "@/lib/api";
import { SERVICE_OPTIONS } from "@/lib/content";

const EMPTY = { name: "", phone: "", email: "", service: "", message: "" };
const field = "h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-[#16A34A]/40";

export const ContactForm = () => {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
        <CheckCircle2 className="h-14 w-14 text-[#16A34A] mx-auto" />
        <h3 className="text-2xl font-bold text-slate-900">Vielen Dank für Ihre Anfrage!</h3>
        <p className="text-slate-600">Wir melden uns so schnell wie möglich bei Ihnen.</p>
        <button onClick={() => setDone(false)} className="text-sm font-semibold text-[#0284C7] hover:underline" data-testid="contact-new-request">Weitere Anfrage senden</button>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="contact-form">
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
        <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
          <SelectTrigger className={field} data-testid="contact-select-service"><SelectValue placeholder="Bitte auswählen" /></SelectTrigger>
          <SelectContent>
            {SERVICE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} data-testid={`contact-service-option-${o.value.toLowerCase()}`}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Nachricht / Details</Label>
        <Textarea id="message" rows={5} value={form.message} onChange={set("message")} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-[#16A34A]/40" placeholder="z. B. Wohnungsgröße, gewünschter Termin, Adresse..." data-testid="contact-input-message" />
      </div>
      <button type="submit" disabled={loading} data-testid="contact-submit-button"
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5132] hover:bg-[#0C4128] disabled:opacity-60 text-white font-semibold px-7 py-4 transition-colors">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Anfrage absenden
      </button>
      <p className="text-xs text-slate-500">Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten gemäß unserer Datenschutzerklärung zu.</p>
    </form>
  );
};
