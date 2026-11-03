export const BrandMark = ({ className = "h-11 w-auto", blue = "#1170C4", green = "#7DC242" }) => (
  <svg viewBox="0 0 120 84" className={className} role="img" aria-label="Cleaning Services Logo">
    <g fill={blue}>
      <path d="M22 18h14l6 4v4h-6l-2 4h-10z" />
      <rect x="26" y="12" width="7" height="6" rx="1.5" />
      <path d="M24 30h12l3 8v22a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4V38z" />
      <rect x="58" y="10" width="4.5" height="40" rx="2.2" />
      <path d="M46 50h28a3 3 0 0 1 3 3v3H43v-3a3 3 0 0 1 3-3z" />
      <rect x="44" y="57" width="32" height="3.5" rx="1.5" opacity=".75" />
      <rect x="93" y="6" width="4.5" height="40" rx="2.2" transform="rotate(14 95 26)" />
      <path d="M83 46h18l6 20H77z" transform="rotate(14 92 56)" />
    </g>
    <g stroke="#fff" strokeWidth="1.4" opacity=".55">
      <path d="M85 50l-3 15M90 50l-1.5 16M95 50v16M100 51l1.5 15" transform="rotate(14 92 56)" />
    </g>
    <path d="M6 70c30 14 78 14 108-8-24 26-82 26-108 8z" fill={green} />
  </svg>
);

export const BrandLogo = ({ light = false, size = "md" }) => (
  <span className="flex items-center gap-2.5">
    <BrandMark className={size === "lg" ? "h-14 w-auto" : "h-11 w-auto"} blue={light ? "#FFFFFF" : "#1170C4"} />
    <span className="flex flex-col leading-none">
      <span className={`font-brand font-extrabold tracking-tight ${size === "lg" ? "text-3xl" : "text-2xl"} ${light ? "text-white" : "text-[#1170C4]"}`}>Cleaning</span>
      <span className={`text-[10px] font-semibold tracking-[0.42em] mt-0.5 ${light ? "text-slate-300" : "text-slate-500"}`}>SERVICES</span>
    </span>
  </span>
);
