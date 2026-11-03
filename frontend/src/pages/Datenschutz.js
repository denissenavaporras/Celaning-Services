import { COMPANY } from "@/lib/content";
import { LegalShell } from "./Impressum";

export default function Datenschutz() {
  return (
    <LegalShell title="Datenschutz" testid="datenschutz-page">
      <p className="text-sm text-slate-500">Datenschutzerklärung gemäß DSGVO (Platzhalter – bitte rechtlich prüfen lassen).</p>
      <div>
        <h2>Verantwortlicher</h2>
        <p>{COMPANY.name}, [Adresse], E-Mail: {COMPANY.email}, Telefon: {COMPANY.phoneDisplay}</p>
      </div>
      <div>
        <h2>Kontaktformular</h2>
        <p>Wenn Sie uns über das Kontaktformular eine Anfrage senden, verarbeiten wir Name, Telefonnummer, E-Mail-Adresse, gewünschte Leistung und Ihre Nachricht ausschließlich zur Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b DSGVO). Die Daten werden nicht ohne Ihre Einwilligung weitergegeben.</p>
      </div>
      <div>
        <h2>Chat-Assistent</h2>
        <p>Unser Chat-Assistent beantwortet Fragen zu Leistungen und Preisen mithilfe eines KI-Dienstes. Bitte geben Sie im Chat keine sensiblen personenbezogenen Daten ein.</p>
      </div>
      <div>
        <h2>Ihre Rechte</h2>
        <p>Ihnen stehen grundsätzlich die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch zu. Beschwerden können Sie bei der Österreichischen Datenschutzbehörde einreichen.</p>
      </div>
    </LegalShell>
  );
}
