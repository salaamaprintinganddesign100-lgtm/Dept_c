export function StatusBadge({ status, onClick, disabled }) {
  const complete = String(status).toUpperCase() === "COMPLETE";
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[88px] text-xs px-2.5 py-1 rounded-md font-semibold tracking-wide transition ${
        complete
          ? "bg-mint/45 text-moss border border-mint/60"
          : "bg-clay/10 text-clay border border-clay/25"
      } ${onClick && !disabled ? "hover:opacity-80 cursor-pointer" : ""} ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {complete ? "COMPLETE" : "PENDING"}
    </Tag>
  );
}

export function AttendanceChip({ status, active, onClick, disabled }) {
  const styles = {
    PRESENT: "bg-fog text-moss border-moss/25",
    ABSENT: "bg-clay/15 text-clay border-clay/30",
    LATE: "bg-fog text-leaf border-moss/25",
    EXCUSED: "bg-fog text-moss border-moss/20",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition ${
        active ? styles[status] || styles.PRESENT : "bg-white text-ink/45 border-moss/15"
      } ${disabled ? "opacity-50" : "hover:border-moss/40"}`}
    >
      {status}
    </button>
  );
}
