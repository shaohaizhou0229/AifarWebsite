"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { localizedPath } from "@/i18n/routing";

const QUICK_JUMP_COMMANDS = [
  { key: "home", href: "/admin/" },
  { key: "product", href: "/admin/product/" },
  { key: "downloads", href: "/admin/downloads/" },
  { key: "users", href: "/admin/users/" },
  { key: "docs", href: "/admin/docs/" },
  { key: "support", href: "/admin/support/" },
  { key: "contact", href: "/admin/contact/" },
  { key: "collaboration", href: "/admin/collaboration/" },
  { key: "notifications", href: "/admin/notifications/" }
];

export function AdminQuickJump({ locale, labels = {}, navLabels = {} }) {
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function openFromShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", openFromShortcut);
    return () => document.removeEventListener("keydown", openFromShortcut);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();

    function closeOnOutsideClick(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
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

  const commands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return QUICK_JUMP_COMMANDS
      .map((command) => ({
        ...command,
        label: navLabels[command.key] || labels.commands?.[command.key] || command.key
      }))
      .filter((command) => !normalizedQuery || command.label.toLowerCase().includes(normalizedQuery));
  }, [labels.commands, navLabels, query]);

  return (
    <div className="admin-quick-jump">
      <button className="admin-sidebar-search" type="button" onClick={() => setOpen(true)}>
        <Search aria-hidden="true" size={14} strokeWidth={1.8} />
        <span>{labels.search || "Quick jump"}</span>
        <kbd>{labels.searchShortcut || "Ctrl K"}</kbd>
      </button>

      {open ? (
        <div className="admin-command-overlay" role="presentation">
          <div className="admin-command-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={labels.search || "Quick jump"}>
            <div className="admin-command-search">
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder || labels.search || "Quick jump"}
              />
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.close || "Close"}>
                <X aria-hidden="true" size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="admin-command-list">
              {commands.length ? commands.map((command) => (
                <Link
                  href={localizedPath(locale, command.href)}
                  key={command.key}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                >
                  <span>{command.label}</span>
                  <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} />
                </Link>
              )) : (
                <p>{labels.emptySearch || "No matching module."}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
