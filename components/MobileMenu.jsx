"use client";

import { useState } from "react";

export function MobileMenuButton({ label, controls = "site-navigation" }) {
  const [isOpen, setIsOpen] = useState(false);

  function toggle() {
    setIsOpen((current) => {
      const next = !current;
      document.getElementById(controls)?.setAttribute("data-open", String(next));
      return next;
    });
  }

  return (
    <button
      className="menu-toggle"
      type="button"
      aria-label={label}
      aria-expanded={String(isOpen)}
      aria-controls={controls}
      onClick={toggle}
      data-menu-toggle
    >
      <span />
    </button>
  );
}
