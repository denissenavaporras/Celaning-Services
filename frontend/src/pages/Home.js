import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { OVERVIEW, ADVANTAGES, IMAGES, COMPANY } from "@/lib/content";

const Hero = () => (
  <section className="relative overflow-hidden" data-testid="home-hero">
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 lg:pt-20 pb-16 grid lg:grid-cols-12 gap-12 items-center">
      <div className="lg:col-span-6 space-y-8">
        <span className="rise inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#0F5132] bg-[#E8F5E9] px-3 py-1.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Oberösterreich · 365 Tage
        </span>
        <h1 className="rise d1 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-slate-900" data-testid="hero-title">
          Ihr zuverlässiger Partner für <span className="text-[#16A34A]">Reinigung</span>, Haus & Garten in <span className="text-[#0284C7]">Oberösterreich.</span>
        </h1>
        <p className="rise d2 text-base md:text-lg leading-relaxed text-slate-600 max-w-xl" data-testid="hero-subtitle">
          Von der Wohnungsreinigung über die Dachrinnen- und PV-Reinigung bis zum Winterdienst – wir kümmern uns um Ihr Eigentum. Professionell, transparent und zu 365 Tagen im Jahr.
        </p>
        <div className="rise d3 flex flex-col sm:flex-row gap-3">
          <Link to="/kontakt#angebot" data-testid="hero-primary-cta" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5132] hover:bg-[#0C4128] text-white font-semibold px-7 py-4 transition-colors">
            Jetzt unverbindliches Angebot anfordern <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/leistungen" data-testid="hero-secondary-cta" className="inline-flex items-center justify-center rounded-full border-2 border-[#0284C7]/30 text-[#0369A1] hover:bg-[#E0F2FE] font-semibold px-7 py-4 transition-colors">
            Leistungen entdecken
          </Link>
        </div>
        <div className="rise d4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          {["Kostenlose Besichtigung", "Transparente Fixpreise", "Auch an Feiertagen"].map((t) => (
            <span key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A34A]" />{t}</span>
          ))}
        </div>
      </div>
      <div className="lg:col-span-6 relative rise d2">
        <div className="absolute -inset-4 bg-gradient-to-br from-[#E8F5E9] to-[#E0F2FE] rounded-[2.5rem] -rotate-2" />
        <img src={IMAGES.hero} alt="Gepflegtes Haus mit Garten und PV-Anlage in Oberösterreich" className="relative w-full aspect-[4/3] object-cover rounded-[2rem] shadow-xl" />
        <a href={`tel:${COMPANY.phone}`} data-testid="hero-phone-card" className="absolute -bottom-6 left-6 bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
          <span className="h-11 w-11 rounded-full bg-[#0284C7] text-white flex items-center justify-center"><Phone className="h-5 w-5" /></span>
          <span><span className="block text-xs text-slate-500">Rufen Sie uns an</span><span className="font-display font-bold text-slate-900">{COMPANY.phoneDisplay}</span></span>
        </a>
      </div>
    </div>
  </section>
);

const Overview = () => (
  <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20" data-testid="home-services-overview">
    <div className="max-w-2xl mb-12">
      <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0284C7] mb-3">Was wir tun</p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Unsere Leistungen im Überblick</h2>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {OVERVIEW.map(({ id, icon: Icon, title, text, tone }) => (
        <Link key={id} to={`/leistungen#${id}`} data-testid={`overview-card-${id}`}
          className="group bg-white rounded-3xl border border-slate-200 p-7 hover:border-[#16A34A]/40 hover:shadow-lg hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-300">
          <span className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ${tone === "green" ? "bg-[#E8F5E9] text-[#0F5132]" : "bg-[#E0F2FE] text-[#0369A1]"}`}>
            <Icon className="h-7 w-7" />
          </span>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#0F5132]">Mehr erfahren <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
        </Link>
      ))}
    </div>
  </section>
);

const WhyUs = () => (
  <section className="max-w-7xl mx-auto px-5 lg:px-8" data-testid="home-why-us">
    <div className="relative grain overflow-hidden bg-[#0F5132] rounded-[2.5rem] px-6 sm:px-12 py-16 grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-4">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#86EFAC] mb-3">Ihre Vorteile</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Warum wir?</h2>
        <p className="mt-4 text-emerald-100/80 leading-relaxed">Vertrauen entsteht durch Verlässlichkeit, klare Preise und sicheres Arbeiten.</p>
      </div>
      <div className="lg:col-span-8 grid sm:grid-cols-2 gap-5">
        {ADVANTAGES.map(({ icon: Icon, title, text }, i) => (
          <div key={title} data-testid={`advantage-${i}`} className="bg-white/[0.07] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.12] transition-colors">
            <Icon className="h-7 w-7 text-[#7DD3FC] mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
            <p className="text-sm text-emerald-50/80 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default function Home() {
  return (
    <>
      <Hero />
      <Overview />
      <WhyUs />
    </>
  );
}
