import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { COMPANY } from "@/lib/content";
import { BrandLogo } from "./BrandMark";

const NAV = [
  { to: "/", label: "Home", id: "home" },
  { to: "/leistungen", label: "Leistungen", id: "leistungen" },
  { to: "/kontakt", label: "Über uns / Kontakt", id: "kontakt" },
];

export const Logo = ({ light = false }) => (
  <Link to="/" data-testid={light ? "footer-logo-link" : "header-logo-link"} className="hover:opacity-90 transition-opacity">
    <BrandLogo light={light} />
  </Link>
);

const linkCls = ({ isActive }) =>
  `px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
    isActive ? "bg-[#EEF7E4] text-[#1170C4]" : "text-slate-600 hover:text-[#1170C4] hover:bg-slate-100"
  }`;

export const Header = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[72px] flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end className={linkCls} data-testid={`nav-${n.id}-link`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <a href={`tel:${COMPANY.phone}`} data-testid="header-phone-link" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-[#1170C4] transition-colors">
            <Phone className="h-4 w-4" /> {COMPANY.phoneDisplay}
          </a>
          <Link to="/kontakt#angebot" data-testid="header-cta-button" className="rounded-full bg-[#1170C4] hover:bg-[#0D5CA3] text-white text-sm font-semibold px-5 py-2.5 transition-colors">
            Angebot anfordern
          </Link>
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle" aria-label="Menü">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-5 py-4 flex flex-col gap-1" data-testid="mobile-menu">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end className={linkCls} onClick={() => setOpen(false)} data-testid={`mobile-nav-${n.id}-link`}>
              {n.label}
            </NavLink>
          ))}
          <Link to="/kontakt#angebot" onClick={() => setOpen(false)} className="mt-2 text-center rounded-full bg-[#1170C4] text-white font-semibold px-5 py-3" data-testid="mobile-cta-button">
            Angebot anfordern
          </Link>
        </div>
      )}
    </header>
  );
};
