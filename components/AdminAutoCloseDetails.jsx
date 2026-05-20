"use client";

import { useEffect, useRef, useState } from "react";

export function AdminAutoCloseDetails({
  className,
  summaryClassName,
  summaryLabel,
  summary,
  children
}) {
  const detailsRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (detailsRef.current && !detailsRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeAfterSelection(event) {
    if (event.target.closest("summary")) return;
    if (event.target.closest("a, button")) setOpen(false);
  }

  return (
    <details
      className={className}
      open={open}
      ref={detailsRef}
      onClick={closeAfterSelection}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={summaryClassName} aria-label={summaryLabel}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
