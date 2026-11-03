import { Sparkles, Trees, Sun, Snowflake, CalendarCheck, BadgeEuro, ShieldCheck, HeartHandshake } from "lucide-react";

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
  hero: IMG + "c463a7b266abb3ff79c395dcd91bd843db95e41f64c11f0743b6a24b8292f7a8.jpeg",
  wohnung: IMG + "e87f1f4d96e239c4b37f17623394ef9d0ddd8b68828caa525e4720b5d0e424a7.jpeg",
  pv: IMG + "03bb6900f809bda2346e2ce9cc1454ef47276966635597754c727d28200dc90c.jpeg",
  garten: IMG + "40ea912e33b43aecafd32059a8312f8fde9ce889ef7cc057ab62a7e6ebcd6e45.jpeg",
  winter: IMG + "da75bf76218dadd16839c26119b0bd657dce67d6077601f95992445386508a0b.jpeg",
  team: IMG + "1145f80dfb1cde91dde0ecbaf7c795758d25b7ed246697aa7bdfb295e1441a96.jpeg",
};

export const OVERVIEW = [
  { id: "wohnung", icon: Sparkles, title: "Wohnungsreinigung", text: "Allgemein & Tiefenreinigung (inkl. Badezimmer).", tone: "green" },
  { id: "garten", icon: Trees, title: "Garten & Außenbereich", text: "Gartenpflege, Wintervorbereitung & Laubentfernung.", tone: "green" },
  { id: "dach", icon: Sun, title: "Dach & PV", text: "Dachrinnen-, Dach- & Photovoltaikreinigung.", tone: "blue" },
  { id: "winter", icon: Snowflake, title: "Winterdienst", text: "Schneeräumung für Gehwege, Einfahrten & Zufahrten.", tone: "blue" },
];

export const ADVANTAGES = [
  { icon: CalendarCheck, title: "365 Tage verfügbar", text: "Auch an Feiertagen zum regulären Tarif." },
  { icon: BadgeEuro, title: "Transparente Fixpreise", text: "Keine versteckten Kosten nach kostenloser Besichtigung." },
  { icon: ShieldCheck, title: "Höchste Sicherheit", text: "Einhaltung aller österreichischen Sicherheitsvorschriften (Absturzsicherung)." },
  { icon: HeartHandshake, title: "Flexibel & Fair", text: "Eigene Reinigungsmittel oder Ihre vorhandenen Materialien. Honorarnote auf Wunsch." },
];

export const SERVICE_OPTIONS = [
  { value: "Wohnung", label: "Wohnung" },
  { value: "Dach", label: "Dach" },
  { value: "Garten", label: "Garten" },
  { value: "Winterdienst", label: "Winterdienst" },
];
