"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { localizedPath } from "@/i18n/routing";

const QUICK_JUMP_COMMANDS = [
  { key: "home", href: "/admin/" },
  { key: "product", href: "/admin/product/" },
  { key: "assets", href: "/admin/assets/" },
  { key: "downloads", href: "/admin/downloads/" },
  { key: "users", href: "/admin/users/" },
  { key: "docs", href: "/admin/docs/" },
  { key: "support", href: "/admin/support/" },
  { key: "contact", href: "/admin/contact/" },
  { key: "collaboration", href: "/admin/collaboration/" },
  { key: "aiSettings", href: "/admin/settings/ai/" },
  { key: "notifications", href: "/admin/notifications/" }
];

const COMMAND_PERMISSION_BY_KEY = {
  product: "admin.product",
  assets: "admin.assets",
  downloads: "admin.downloads",
  users: "admin.users",
  docs: "admin.docs",
  support: "admin.support",
  contact: "admin.contact",
  collaboration: "admin.collaboration",
  aiSettings: "admin.settings"
};

function canSeeCommand(key, permissions = []) {
  const permission = COMMAND_PERMISSION_BY_KEY[key];
  return !permission || permissions.includes(permission);
}

export function AdminQuickJump({ locale, labels = {}, navLabels = {}, permissions = [] }) {
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
      .filter((command) => canSeeCommand(command.key, permissions))
      .map((command) => ({
        ...command,
        label: navLabels[command.key] || labels.commands?.[command.key] || command.key
      }))
      .filter((command) => !normalizedQuery || command.label.toLowerCase().includes(normalizedQuery));
  }, [labels.commands, navLabels, permissions, query]);

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
                aria-label={labels.searchPlaceholder || labels.search || "Quick jump"}
                name="adminQuickJump"
                autoComplete="off"
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
