import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Phone, Droplets } from "lucide-react";
import { COMPANY } from "@/lib/content";

const NAV = [
  { to: "/", label: "Home", id: "home" },
  { to: "/leistungen", label: "Leistungen", id: "leistungen" },
  { to: "/kontakt", label: "Über uns / Kontakt", id: "kontakt" },
];

export const Logo = ({ light = false }) => (
  <Link to="/" data-testid="header-logo-link" className="flex items-center gap-2.5 group">
    <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#16A34A] to-[#0284C7] flex items-center justify-center shadow-sm group-hover:rotate-6 transition-transform duration-300">
      <Droplets className="h-5 w-5 text-white" />
    </span>
    <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-[#0F5132]"}`}>
      Cleaning <span className={light ? "text-sky-300" : "text-[#0284C7]"}>Services</span>
    </span>
  </Link>
);

const linkCls = ({ isActive }) =>
  `px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
    isActive ? "bg-[#E8F5E9] text-[#0F5132]" : "text-slate-600 hover:text-[#0F5132] hover:bg-slate-100"
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
          <a href={`tel:${COMPANY.phone}`} data-testid="header-phone-link" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-[#0284C7] transition-colors">
            <Phone className="h-4 w-4" /> {COMPANY.phoneDisplay}
          </a>
          <Link to="/kontakt#angebot" data-testid="header-cta-button" className="rounded-full bg-[#0F5132] hover:bg-[#0C4128] text-white text-sm font-semibold px-5 py-2.5 transition-colors">
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
          <Link to="/kontakt#angebot" onClick={() => setOpen(false)} className="mt-2 text-center rounded-full bg-[#0F5132] text-white font-semibold px-5 py-3" data-testid="mobile-cta-button">
            Angebot anfordern
          </Link>
        </div>
      )}
    </header>
  );
};
