import { Link } from "react-router-dom";
import { Clock, Check, MapPin, ArrowRight, Tag, Gift } from "lucide-react";
import { IMAGES, LAUNCH, bookUrl } from "@/lib/content";

const Section = ({ id, letter, title, img, children, reverse }) => (
  <section id={id} data-testid={`service-section-${id}`} className="scroll-mt-24 grid lg:grid-cols-12 gap-10 items-start py-14 border-t border-slate-200 first:border-t-0">
    <div className={`lg:col-span-5 ${reverse ? "lg:order-2" : ""}`}>
      <img src={img} alt={title} className="w-full aspect-[4/3] object-cover rounded-3xl shadow-md" />
    </div>
    <div className="lg:col-span-7 space-y-6">
      <div className="flex items-center gap-4">
        <span className="font-display text-5xl font-extrabold text-[#5FA52E]/25">{letter}</span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  </section>
);

const Item = ({ title, text, time }) => (
  <div className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-5">
    <Check className="h-5 w-5 mt-0.5 text-[#5FA52E] shrink-0" />
    <div className="flex-1">
      <p className="font-semibold text-slate-900">{title}</p>
      {text && <p className="text-sm text-slate-600 mt-1">{text}</p>}
    </div>
    {time && <span className="shrink-0 self-start inline-flex items-center gap-1 text-xs font-semibold text-[#0D5CA3] bg-[#E6F0FA] px-2.5 py-1 rounded-full"><Clock className="h-3 w-3" />{time}</span>}
  </div>
);

const BookBtn = ({ service, offer, testid, light }) => (
  <Link to={bookUrl(service, offer)} data-testid={testid}
    className={`shrink-0 inline-flex items-center gap-1 rounded-full text-xs font-bold px-3 py-1.5 transition-colors ${light ? "bg-[#7DC242] text-[#1E2F6B] hover:bg-[#A6DB7A]" : "bg-[#7DC242]/15 text-[#3F7A1C] hover:bg-[#7DC242] hover:text-[#1E2F6B]"}`}>
    Jetzt buchen <ArrowRight className="h-3 w-3" />
  </Link>
);

const PriceRow = ({ label, price, testid, service, offer }) => (
  <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2 py-3 border-b border-dashed border-slate-200 last:border-0" data-testid={testid}>
    <span className="text-slate-700 flex-1 min-w-0 break-words">{label}</span>
    <span className="font-display font-bold text-[#1170C4] whitespace-nowrap">{price}</span>
    {offer && <BookBtn service={service} offer={offer} testid={`${testid}-book`} />}
  </div>
);

const LaunchTag = () => (
  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-bold text-[#1E2F6B] bg-[#7DC242] px-2 py-0.5 rounded-full">
    <Tag className="h-3 w-3" />{LAUNCH.label}
  </span>
);

const LaunchBanner = () => (
  <div className="rise d3 mt-8 rounded-2xl border-2 border-[#7DC242] bg-white p-5 sm:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between" data-testid="launch-banner">
    <div className="flex items-start gap-4">
      <span className="h-12 w-12 shrink-0 rounded-full bg-[#7DC242] text-[#1E2F6B] flex items-center justify-center"><Gift className="h-6 w-6" strokeWidth={1.6} /></span>
      <div>
        <p className="font-display text-xl font-bold text-[#1E2F6B]">Einführungsangebot – nur 30 Tage!</p>
        <p className="text-sm text-slate-600 mt-0.5">Alle Preise sind Einführungspreise, <strong>{LAUNCH.period}</strong>. Jetzt in diesem Zeitraum buchen und sichern.</p>
      </div>
    </div>
    <Link to={bookUrl("Wohnung", "Einführungsangebot")} data-testid="launch-banner-book" className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-[#1170C4] hover:bg-[#0D5CA3] text-white font-semibold px-6 py-3.5 transition-colors">
      Jetzt buchen <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
    </Link>
  </div>
);

const Wohnung = () => (
  <Section id="wohnung" letter="A" title="Wohnungsreinigung" img={IMAGES.wohnung}>
    <div className="space-y-3">
      <Item title="Allgemeine Reinigung" text="Staubsaugen, Wischen, Möbel." time="2–3 Std." />
      <Item title="Badezimmer (Zusatz)" text="Entkalkung, Desinfektion von WC & Dusche." time="1–2 Std." />
      <Item title="Tiefenreinigung" text="Wände, Küchenschubladen (innen/außen) & Kalkentfernung." time="3–4 Std." />
    </div>
    <div className="grid xl:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border-2 border-[#5FA52E]/30 p-6" data-testid="price-table-tiefenreinigung">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#5FA52E]">Preise Tiefenreinigung</p><LaunchTag />
        </div>
        <PriceRow label="70–90 m²" price="150 €" testid="price-70-90" service="Wohnung" offer="Tiefenreinigung 70–90 m² – 150 € (Einführungspreis)" />
        <PriceRow label="91–120 m²" price="250 €" testid="price-91-120" service="Wohnung" offer="Tiefenreinigung 91–120 m² – 250 € (Einführungspreis)" />
        <PriceRow label="> 121 m²" price="Angebot" testid="price-121" service="Wohnung" offer="Tiefenreinigung über 121 m² – individuelles Angebot" />
      </div>
      <div className="bg-white rounded-2xl border-2 border-[#1170C4]/25 p-6" data-testid="price-table-zusatz">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#1170C4]">Zusatzleistungen</p><LaunchTag />
        </div>
        <PriceRow label={"Wäsche waschen/\u200Bbügeln"} price="20–25 €/Std." testid="price-waesche" service="Wohnung" offer="Zusatz: Wäsche waschen/bügeln – 20–25 €/Std. (Einführungspreis)" />
        <PriceRow label="Küche aufräumen" price="10–15 €" testid="price-kueche" service="Wohnung" offer="Zusatz: Küche aufräumen – 10–15 € (Einführungspreis)" />
        <PriceRow label="Müll" price="5 €" testid="price-muell" service="Wohnung" offer="Zusatz: Müll entsorgen – 5 € (Einführungspreis)" />
      </div>
    </div>
  </Section>
);

const Dach = () => (
  <Section id="dach" letter="B" title="Dach, Dachrinnen & PV-Anlagen" img={IMAGES.pv} reverse>
    <div className="space-y-3">
      <Item title="Dachrinnenreinigung" text="Manuelle Entfernung von Laub & Sedimenten inkl. Funktionsprüfung." />
      <Item title="Dachreinigung" text="Sanfte Moos- & Algenentfernung (ohne aggressiven Hochdruckreiniger)." />
      <Item title="PV-Reinigung" text="Osmotisches Wasser für maximale Leistung. Inkl. Sicherheitsabschaltung." />
    </div>
  </Section>
);

const Garten = () => (
  <Section id="garten" letter="C" title="Garten & Wintervorbereitung" img={IMAGES.garten}>
    <div className="space-y-3">
      <Item title="Gartenpflege" text="Rasenmähen, Heckenschnitt, Unkrautentfernung." />
      <Item title="Wintervorbereitung" text="Laubentfernung, Dachrinnen-Check, Frostschutz für Pflanzen, Aufstellen von Schneestangen." />
    </div>
  </Section>
);

const Winter = () => (
  <Section id="winter" letter="D" title="Winterdienst (Schneeräumung)" img={IMAGES.winter} reverse>
    <Item title="Räumung von Gehwegen, Einfahrten & Zufahrten." />
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="bg-[#1170C4] text-white rounded-2xl p-6" data-testid="price-winterdienst">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-sky-100">{LAUNCH.label}</p>
          <span className="text-[10px] font-semibold text-sky-100">15.11.–15.12.2026</span>
        </div>
        <p className="font-display text-4xl font-extrabold">40 €<span className="text-lg font-semibold"> / Stunde</span></p>
        <p className="text-sm text-sky-100 mt-1 mb-4">ca. 1–2 Std. pro Einsatz</p>
        <BookBtn service="Winterdienst" offer="Winterdienst – 40 €/Std. (Einführungspreis)" testid="price-winterdienst-book" light />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6" data-testid="winterdienst-area">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-slate-500 mb-2">Einsatzgebiet</p>
        <p className="flex items-start gap-2 font-semibold text-slate-900"><MapPin className="h-5 w-5 text-[#5FA52E] shrink-0" />Wels & 50 km Umgebung · bald Wien</p>
      </div>
    </div>
  </Section>
);

export default function Leistungen() {
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-14" data-testid="leistungen-page">
      <div className="max-w-3xl mb-6">
        <p className="rise text-xs uppercase tracking-[0.2em] font-semibold text-[#1170C4] mb-3">Leistungen & Preise</p>
        <h1 className="rise d1 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">Alles für Ihr Zuhause – aus einer Hand.</h1>
        <p className="rise d2 mt-5 text-base md:text-lg text-slate-600">Transparente Fixpreise nach kostenloser Besichtigung. Keine versteckten Kosten.</p>
      </div>
      <LaunchBanner />
      <Wohnung />
      <Dach />
      <Garten />
      <Winter />
      <div className="mt-6 rounded-3xl bg-[#EEF7E4] p-8 sm:p-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-[#1170C4]">Bereit für ein unverbindliches Angebot?</h3>
          <p className="text-slate-600 mt-1">Wir melden uns schnellstmöglich bei Ihnen.</p>
        </div>
        <Link to="/kontakt#angebot" data-testid="leistungen-cta" className="group inline-flex items-center gap-2 rounded-full bg-[#1170C4] hover:bg-[#0D5CA3] text-white font-semibold px-7 py-4 transition-colors">
          Angebot anfordern <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
