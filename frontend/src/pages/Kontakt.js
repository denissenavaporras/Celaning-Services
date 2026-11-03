import { Leaf, ShieldCheck, Sparkles, Phone, Mail, MessageCircle } from "lucide-react";
import { IMAGES, COMPANY } from "@/lib/content";
import { ContactForm } from "@/components/site/ContactForm";

const VALUES = [
  { icon: Sparkles, title: "Gründliche Sauberkeit", text: "Wir arbeiten sorgfältig und mit Liebe zum Detail – bis alles glänzt." },
  { icon: Leaf, title: "Umweltbewusst", text: "Wir setzen auf passende, schonende Reinigungsmittel und Methoden – z. B. osmotisches Wasser statt Chemie." },
  { icon: ShieldCheck, title: "Sicherheit zuerst", text: "Absturzsicherung und Einhaltung aller österreichischen Sicherheitsvorschriften bei jedem Einsatz." },
];

const About = () => (
  <section className="grid lg:grid-cols-12 gap-12 items-center" data-testid="about-section">
    <div className="lg:col-span-5 rise">
      <img src={IMAGES.team} alt="Unser Reinigungsteam" className="w-full aspect-[4/5] object-cover rounded-[2rem] shadow-lg" />
    </div>
    <div className="lg:col-span-7 space-y-6">
      <p className="rise text-xs uppercase tracking-[0.2em] font-semibold text-[#0284C7]">Über uns</p>
      <h1 className="rise d1 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">Sauberkeit mit Verantwortung.</h1>
      <p className="rise d2 text-base md:text-lg leading-relaxed text-slate-600" data-testid="about-text">
        Bei Cleaning Services steht Ihr Zuhause im Mittelpunkt. Wir verpflichten uns zu gründlicher, zuverlässiger Reinigung – innen wie außen. Dabei achten wir bewusst auf die Umwelt: Wir verwenden geeignete, materialschonende Produkte und vermeiden aggressive Mittel, wo immer es möglich ist. Ebenso wichtig ist uns die Sicherheit bei der Arbeit – ob auf dem Dach, an der PV-Anlage oder im Winterdienst halten wir alle österreichischen Sicherheitsvorschriften konsequent ein.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 pt-2">
        {VALUES.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="bg-white border border-slate-200 rounded-2xl p-5" data-testid={`about-value-${i}`}>
            <Icon className="h-6 w-6 text-[#16A34A] mb-3" />
            <p className="font-semibold text-slate-900 mb-1">{title}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ContactInfo = () => (
  <div className="space-y-6">
    <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#86EFAC]">Kontakt</p>
    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Jetzt unverbindliches Angebot anfordern</h2>
    <p className="text-emerald-100/80 leading-relaxed">Kostenlose Besichtigung, transparenter Fixpreis. Wir antworten schnell – auch per WhatsApp.</p>
    <div className="space-y-3 pt-2">
      <a href={`tel:${COMPANY.phone}`} data-testid="contact-phone-link" className="flex items-center gap-3 text-white hover:text-[#86EFAC] transition-colors"><Phone className="h-5 w-5" />{COMPANY.phoneDisplay}</a>
      <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" data-testid="contact-whatsapp-link" className="flex items-center gap-3 text-white hover:text-[#86EFAC] transition-colors"><MessageCircle className="h-5 w-5" />WhatsApp Business</a>
      <a href={`mailto:${COMPANY.email}`} data-testid="contact-email-link" className="flex items-center gap-3 text-white hover:text-[#86EFAC] transition-colors break-all"><Mail className="h-5 w-5 shrink-0" />{COMPANY.email}</a>
    </div>
  </div>
);

export default function Kontakt() {
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-14 space-y-24" data-testid="kontakt-page">
      <About />
      <section id="angebot" className="scroll-mt-24 relative grain overflow-hidden bg-[#0F5132] rounded-[2.5rem] p-6 sm:p-12 grid lg:grid-cols-12 gap-10" data-testid="contact-section">
        <div className="lg:col-span-5"><ContactInfo /></div>
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 relative z-10"><ContactForm /></div>
      </section>
    </div>
  );
}
