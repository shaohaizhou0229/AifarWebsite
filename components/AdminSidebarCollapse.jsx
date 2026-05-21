"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "aifar-admin-sidebar-collapsed";

export function AdminSidebarCollapse({ collapseLabel = "Collapse", expandLabel = "Expand" }) {
  const [collapsed, setCollapsed] = useState(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setCollapsed(stored === null ? true : stored === "true");
  }, []);

  useEffect(() => {
    function onRequestedCollapse(event) {
      setCollapsed(Boolean(event.detail?.collapsed));
    }

    window.addEventListener("aifar-admin-sidebar:set-collapsed", onRequestedCollapse);
    return () => window.removeEventListener("aifar-admin-sidebar:set-collapsed", onRequestedCollapse);
  }, []);

  useEffect(() => {
    if (collapsed === null) return;

    const shell = buttonRef.current?.closest(".admin-shell");
    shell?.classList.toggle("admin-sidebar-collapsed", collapsed);
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
  }, [collapsed]);

  const isCollapsed = collapsed === true;
  const Icon = isCollapsed ? ChevronsRight : ChevronsLeft;
  const label = isCollapsed ? expandLabel : collapseLabel;

  return (
    <button
      ref={buttonRef}
      className="admin-sidebar-collapse"
      type="button"
      aria-pressed={isCollapsed}
      title={label}
      onClick={() => setCollapsed((value) => !value)}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}
