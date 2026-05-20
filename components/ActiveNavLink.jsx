"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { normalizePathname, stripLocale } from "@/i18n/routing";

function isPathActive(currentPath, patterns = []) {
  return patterns.some((pattern) => {
    const normalizedPattern = normalizePathname(pattern);
    return currentPath === normalizedPattern || currentPath.startsWith(normalizedPattern);
  });
}

function isExactPathActive(currentPath, patterns = []) {
  return patterns.some((pattern) => currentPath === normalizePathname(pattern));
}

export function ActiveNavLink({ href, activePaths = [], exactActivePaths = [], className, children }) {
  const pathname = usePathname();
  const currentPath = stripLocale(pathname || "/");
  const isActive = isExactPathActive(currentPath, exactActivePaths) || isPathActive(currentPath, activePaths);

  return (
    <Link
      className={className}
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
    >
      {children}
    </Link>
  );
}
