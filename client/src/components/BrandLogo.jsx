const LOGO_SRC = "/logo.png";

const sizeMap = {
  xs: "h-8 w-8",
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-24 w-24",
  xl: "h-36 w-36",
  hero: "h-44 w-44 md:h-56 md:w-56",
};

/**
 * Al-Bayaan / DEPT_C official logo.
 * variant: "mark" | "inline" | "stack"
 */
export default function BrandLogo({
  size = "md",
  variant = "inline",
  tone = "light",
  className = "",
  showText = true,
}) {
  const imgClass = sizeMap[size] || sizeMap.md;
  const textTone = tone === "dark" ? "text-[#06235C]" : "text-white";
  const subTone = tone === "dark" ? "text-[#06235C]/55" : "text-white/60";

  const mark = (
    <img
      src={LOGO_SRC}
      alt="Al-Bayaan Institute"
      className={`${imgClass} object-contain drop-shadow-sm shrink-0 ${className}`}
      draggable={false}
    />
  );

  if (variant === "mark" || !showText) return mark;

  if (variant === "stack") {
    return (
      <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
        {mark}
        <div>
          <p className={`font-display font-bold tracking-tight leading-none ${textTone}`}>
            DEPT_C
          </p>
          <p className={`text-[11px] mt-1.5 ${subTone}`}>
            Al-Bayaan · Computer Features
          </p>
          <p className={`text-[10px] mt-1 uppercase tracking-[0.14em] ${subTone}`}>
            Enter to learn to lead
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      {mark}
      <div className="min-w-0">
        <p className={`font-display font-bold tracking-tight leading-none truncate ${textTone}`}>
          DEPT_C
        </p>
        <p className={`text-[11px] mt-1 truncate ${subTone}`}>
          Al-Bayaan Institute
        </p>
      </div>
    </div>
  );
}

export { LOGO_SRC };
