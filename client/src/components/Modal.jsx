import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Centered overlay modal (portaled to body so it sits above the top bar).
 * from="center" (default) | "bottom"
 */
export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  from = "center",
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const bottom = from === "bottom";

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex justify-center p-4 ${
        bottom ? "items-end sm:items-center" : "items-center"
      }`}
    >
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[#06235C]/50 backdrop-blur-[3px] animate-[fadeIn_0.2s_ease]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-[201] w-full max-h-[min(92vh,880px)] flex flex-col bg-white shadow-2xl border border-[#E2E8F2]
          rounded-2xl sm:max-w-lg md:max-w-xl
          ${bottom ? "animate-[slideUp_0.28s_ease-out]" : "animate-[fadeIn_0.2s_ease]"}
        `}
      >
        {bottom && (
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <span className="h-1 w-10 rounded-full bg-[#06235C]/20" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#E2E8F2] shrink-0">
          <div className="min-w-0">
            <p className="font-display font-bold text-[#06235C] text-lg">{title}</p>
            {description ? (
              <p className="text-xs text-[#06235C]/50 mt-0.5">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#06235C]/60 hover:bg-fog"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[#E2E8F2] px-5 py-3.5 bg-[#F3F5FA]/80 shrink-0 rounded-b-2xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
