import { Link } from "react-router-dom";
import { Clock, Check, MapPin, ArrowRight } from "lucide-react";
import { IMAGES } from "@/lib/content";

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

const PriceRow = ({ label, price, testid }) => (
  <div className="flex justify-between items-center py-3 border-b border-dashed border-slate-200 last:border-0" data-testid={testid}>
    <span className="text-slate-700">{label}</span>
    <span className="font-display font-bold text-[#1170C4]">{price}</span>
  </div>
);

const Wohnung = () => (
  <Section id="wohnung" letter="A" title="Wohnungsreinigung" img={IMAGES.wohnung}>
    <div className="space-y-3">
      <Item title="Allgemeine Reinigung" text="Staubsaugen, Wischen, Möbel." time="2–3 Std." />
      <Item title="Badezimmer (Zusatz)" text="Entkalkung, Desinfektion von WC & Dusche." time="1–2 Std." />
      <Item title="Tiefenreinigung" text="Wände, Küchenschubladen (innen/außen) & Kalkentfernung." time="3–4 Std." />
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border-2 border-[#5FA52E]/30 p-6" data-testid="price-table-tiefenreinigung">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#5FA52E] mb-2">Preise Tiefenreinigung</p>
        <PriceRow label="70–90 m²" price="150 €" testid="price-70-90" />
        <PriceRow label="91–120 m²" price="250 €" testid="price-91-120" />
        <PriceRow label="> 121 m²" price="Angebot" testid="price-121" />
      </div>
      <div className="bg-white rounded-2xl border-2 border-[#1170C4]/25 p-6" data-testid="price-table-zusatz">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#1170C4] mb-2">Zusatzleistungen</p>
        <PriceRow label="Wäsche waschen/bügeln" price="20–25 €/Std." testid="price-waesche" />
        <PriceRow label="Küche aufräumen" price="10–15 €" testid="price-kueche" />
        <PriceRow label="Müll" price="5 €" testid="price-muell" />
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
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-sky-100 mb-2">Preis</p>
        <p className="font-display text-4xl font-extrabold">40 €<span className="text-lg font-semibold"> / Stunde</span></p>
        <p className="text-sm text-sky-100 mt-1">ca. 1–2 Std. pro Einsatz</p>
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
