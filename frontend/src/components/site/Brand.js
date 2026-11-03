import { Link } from "react-router-dom";
import { Phone, MessageCircle, Mail, ArrowRight } from "lucide-react";
import { BRAND_BAR, COMPANY } from "@/lib/content";

const BUBBLES = [
  { s: 90, t: "8%", l: "2%", d: "0s" }, { s: 46, t: "62%", l: "6%", d: "1.5s" }, { s: 28, t: "30%", l: "44%", d: "3s" },
  { s: 120, t: "70%", l: "88%", d: "2s" }, { s: 36, t: "12%", l: "92%", d: "4s" }, { s: 18, t: "48%", l: "52%", d: "5s" },
];

export const Bubbles = () => (
  <div className="bubbles hidden md:block" aria-hidden="true">
    {BUBBLES.map((b, i) => (
      <span key={i} style={{ width: b.s, height: b.s, top: b.t, left: b.l, animationDelay: b.d }} />
    ))}
  </div>
);

export const BrandBar = () => (
  <section className="bg-[#1170C4] text-white" data-testid="brand-bar">
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
      {BRAND_BAR.map(({ icon: Icon, text }, i) => (
        <div key={text} className="flex items-center gap-3" data-testid={`brand-bar-item-${i}`}>
          <span className="h-11 w-11 shrink-0 rounded-full border border-white/60 flex items-center justify-center">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <span className="text-sm font-semibold leading-snug">{text}</span>
        </div>
      ))}
    </div>
  </section>
);

const CtaLink = ({ href, icon: Icon, label, testid, external }) => (
  <a href={href} data-testid={testid} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    className="flex items-center gap-3 text-slate-800 hover:text-[#1170C4] transition-colors break-words min-w-0">
    <span className="h-10 w-10 shrink-0 rounded-full border-[1.5px] border-[#1170C4] text-[#1170C4] flex items-center justify-center"><Icon className="h-4 w-4" strokeWidth={1.6} /></span>
    <span className="font-semibold text-sm sm:text-base [overflow-wrap:anywhere]">{label}</span>
  </a>
);

export const CtaBox = () => (
  <section className="max-w-7xl mx-auto px-5 lg:px-8 mt-20" data-testid="cta-box">
    <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-[#7DC242] bg-white p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
      <Bubbles />
      <div className="lg:col-span-6 relative">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#5FA52E] mb-3">Ihr sauberes Zuhause, das ganze Jahr</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E2F6B]">Jetzt Angebot anfragen</h2>
        <Link to="/kontakt#angebot" data-testid="cta-box-button" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#7DC242] hover:bg-[#6BAF35] text-[#1E2F6B] font-bold px-7 py-4 transition-colors">
          Zum Kontaktformular <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      <div className="lg:col-span-6 relative space-y-4">
        <CtaLink href={`tel:${COMPANY.phone}`} icon={Phone} label={COMPANY.phoneDisplay} testid="cta-box-phone" />
        <CtaLink href={COMPANY.whatsapp} icon={MessageCircle} label="WhatsApp Business" testid="cta-box-whatsapp" external />
        <CtaLink href={`mailto:${COMPANY.email}`} icon={Mail} label={COMPANY.email} testid="cta-box-email" />
      </div>
    </div>
  </section>
);
