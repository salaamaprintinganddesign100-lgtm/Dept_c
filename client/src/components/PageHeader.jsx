export function PageHeader({ title, description, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-1">
      <div className="min-w-0 flex items-start gap-3">
        <img
          src="/logo.png"
          alt=""
          className="hidden sm:block h-10 w-10 object-contain opacity-90 mt-0.5 shrink-0"
          draggable={false}
        />
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#06235C] tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-[#06235C]/55 mt-1.5 text-sm max-w-2xl leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function StatStrip({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="ui-panel px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wider text-[#06235C]/45 font-bold">
            {item.label}
          </p>
          <p className="font-display text-2xl font-bold text-[#06235C] tabular-nums mt-1.5 leading-none">
            {item.value}
          </p>
          {item.hint ? (
            <p className="text-xs text-[#06235C]/45 mt-1.5">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Alert({ tone = "error", children }) {
  const styles =
    tone === "success"
      ? "text-[#06235C] bg-[#D6E0F5]/60 border-[#06235C]/15"
      : tone === "info"
        ? "text-[#06235C] bg-fog border-[#E2E8F2]"
        : "text-clay bg-clay/10 border-clay/20";
  return (
    <p className={`text-sm px-3.5 py-2.5 rounded-xl border ${styles}`}>{children}</p>
  );
}

export function LevelBadge({ level, bookTitle }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#06235C] text-white px-3 py-1.5 text-sm font-semibold">
      Level {level}
      {bookTitle ? (
        <span className="font-normal text-white/75">· {bookTitle}</span>
      ) : null}
    </span>
  );
}
