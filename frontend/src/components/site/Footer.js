import { Link } from "react-router-dom";
import { Instagram, Facebook, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { COMPANY, SERVICE_AREA } from "@/lib/content";
import { Logo } from "./Header";

const Social = ({ href, label, icon: Icon, id }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} data-testid={`footer-${id}-link`}
     className="h-11 w-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#5FA52E] hover:border-[#5FA52E] hover:-translate-y-0.5 transition-[background-color,transform] duration-200">
    <Icon className="h-5 w-5" />
  </a>
);

export const Footer = () => (
  <footer className="bg-[#16234F] text-slate-300 pt-16 pb-10 mt-24" data-testid="site-footer">
    <div className="max-w-7xl mx-auto px-5 lg:px-8 grid gap-12 md:grid-cols-12">
      <div className="md:col-span-5 space-y-5">
        <Logo light />
        <p className="text-sm leading-relaxed max-w-sm text-slate-400">
          Ihr zuverlässiger Partner für Reinigung, Haus & Garten in Oberösterreich – 365 Tage im Jahr.
        </p>
        <div className="flex gap-3">
          <Social href={COMPANY.instagram} label="Instagram" icon={Instagram} id="instagram" />
          <Social href={COMPANY.facebook} label="Facebook" icon={Facebook} id="facebook" />
          <Social href={COMPANY.whatsapp} label="WhatsApp Business" icon={MessageCircle} id="whatsapp" />
        </div>
      </div>
      <div className="md:col-span-3 space-y-3 text-sm">
        <h4 className="text-white font-semibold mb-4">Navigation</h4>
        <Link to="/" className="block hover:text-white" data-testid="footer-home-link">Home</Link>
        <Link to="/leistungen" className="block hover:text-white" data-testid="footer-leistungen-link">Leistungen</Link>
        <Link to="/kontakt" className="block hover:text-white" data-testid="footer-kontakt-link">Über uns / Kontakt</Link>
      </div>
      <div className="md:col-span-4 space-y-3 text-sm">
        <h4 className="text-white font-semibold mb-4">Kontakt</h4>
        <a href={`tel:${COMPANY.phone}`} className="flex items-center gap-3 hover:text-white" data-testid="footer-phone-link"><Phone className="h-4 w-4 text-[#7DC242]" />{COMPANY.phoneDisplay}</a>
        <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-3 hover:text-white break-all" data-testid="footer-email-link"><Mail className="h-4 w-4 text-[#7DC242]" />{COMPANY.email}</a>
        <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-[#7DC242]" />{SERVICE_AREA}</p>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-5 lg:px-8 mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-between text-xs text-slate-500">
      <span>© {new Date().getFullYear()} {COMPANY.name}. Alle Rechte vorbehalten.</span>
      <div className="flex gap-5">
        <Link to="/impressum" className="hover:text-white" data-testid="footer-impressum-link">Impressum</Link>
        <Link to="/datenschutz" className="hover:text-white" data-testid="footer-datenschutz-link">Datenschutz</Link>
        <Link to="/admin" className="hover:text-white" data-testid="footer-admin-link">Admin</Link>
      </div>
    </div>
  </footer>
);
