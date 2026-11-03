import { Sprout, Sun, Snowflake, CalendarCheck, BadgeEuro, ShieldCheck, HeartHandshake, CalendarDays, PartyPopper, FileText, SprayCan } from "lucide-react";

const VacuumIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 3c3 0 4 2 4 4v8" /><path d="M18 15h-7a4 4 0 0 0-4 4v1h11z" /><circle cx="9" cy="20.5" r="1" /><circle cx="16" cy="20.5" r="1" /><path d="M4 9h6M4 12h4" />
  </svg>
);

const IMG = "https://static.prod-images.emergentagent.com/jobs/135730af-44fe-4182-919a-7e8e81998af8/images/";

export const COMPANY = {
  name: "Cleaning Services",
  phone: "+436641019869",
  phoneDisplay: "+43 664 1019869",
  email: "denissenavaporras@gmail.com",
  whatsapp: "https://wa.me/436641019869",
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
};

export const IMAGES = {
  hero: IMG + "31f32d536248177f587b1a96e6a02597d23128ea7fa86722edd67d95fde31d53.jpeg",
  wohnung: IMG + "3320a1ecf12597c0006f8f735aac52469c0fa31907550375440a59b6a475d337.jpeg",
  pv: IMG + "edc6e4447d8b7292acc7b4a22ea49ed4bcc8703e0cdcc5aa2f7ec3adbb1c40fa.jpeg",
  garten: IMG + "a0ae917b8ce6b7c8bff511a1e8c31d4997dba0fc8946f2d256678d3836a9b8dc.jpeg",
  winter: IMG + "a0df3f1b6870a0736b34f002964fafbf97839a91ac39868d0aa8adf37e9ef9fc.jpeg",
  team: IMG + "10a2b867dec3b9cfa1cd826439a93dd12d874f0ca814cbb139c9085bf5b58805.jpeg",
};

export const OVERVIEW = [
  { id: "wohnung", icon: VacuumIcon, title: "Wohnungsreinigung", text: "Allgemein & Tiefenreinigung (inkl. Badezimmer).", tone: "green" },
  { id: "garten", icon: Sprout, title: "Garten & Außenbereich", text: "Gartenpflege, Wintervorbereitung & Laubentfernung.", tone: "green" },
  { id: "dach", icon: Sun, title: "Dach & PV", text: "Dachrinnen-, Dach- & Photovoltaikreinigung.", tone: "blue" },
  { id: "winter", icon: Snowflake, title: "Winterdienst", text: "Schneeräumung für Gehwege, Einfahrten & Zufahrten.", tone: "blue" },
];

export const ADVANTAGES = [
  { icon: CalendarCheck, title: "365 Tage verfügbar", text: "Auch an Feiertagen zum regulären Tarif." },
  { icon: BadgeEuro, title: "Transparente Fixpreise", text: "Keine versteckten Kosten nach kostenloser Besichtigung." },
  { icon: ShieldCheck, title: "Höchste Sicherheit", text: "Einhaltung aller österreichischen Sicherheitsvorschriften (Absturzsicherung)." },
  { icon: HeartHandshake, title: "Flexibel & Fair", text: "Eigene Reinigungsmittel oder Ihre vorhandenen Materialien. Honorarnote auf Wunsch." },
];

export const BRAND_BAR = [
  { icon: CalendarDays, text: "365 Tage im Jahr" },
  { icon: PartyPopper, text: "Feiertage ohne Zuschlag" },
  { icon: FileText, text: "Honorarnote auf Wunsch" },
  { icon: SprayCan, text: "Reinigungsmittel inklusive oder Ihre eigenen" },
];

export const SERVICE_AREA = "Wels & 50 km Umgebung · bald Wien";

export const SERVICE_OPTIONS = [
  { value: "Wohnung", label: "Wohnung" },
  { value: "Dach", label: "Dach" },
  { value: "Garten", label: "Garten" },
  { value: "Winterdienst", label: "Winterdienst" },
];
