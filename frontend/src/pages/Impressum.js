import { COMPANY } from "@/lib/content";

export const LegalShell = ({ title, testid, children }) => (
  <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-14" data-testid={testid}>
    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-10">{title}</h1>
    <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 text-slate-700 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900">
      {children}
    </div>
  </div>
);

export default function Impressum() {
  return (
    <LegalShell title="Impressum" testid="impressum-page">
      <p className="text-sm text-slate-500">Angaben gemäß § 5 ECG und § 25 MedienG (Platzhalter – bitte ergänzen).</p>
      <div>
        <h2>Unternehmen</h2>
        <p>{COMPANY.name}<br />[Inhaber/in: Vor- und Nachname]<br />[Straße Hausnummer]<br />[PLZ Ort], Oberösterreich, Österreich</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p>Telefon / WhatsApp: {COMPANY.phoneDisplay}<br />E-Mail: {COMPANY.email}</p>
      </div>
      <div>
        <h2>Unternehmensdaten</h2>
        <p>Unternehmensgegenstand: Reinigung, Haus- & Gartenservice, Winterdienst<br />UID-Nummer: [ATU…]<br />Gewerbebehörde: [Bezirkshauptmannschaft …]<br />Mitglied der WKO Oberösterreich</p>
      </div>
      <div>
        <h2>Haftung für Inhalte</h2>
        <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte übernehmen wir jedoch keine Gewähr.</p>
      </div>
    </LegalShell>
  );
}
