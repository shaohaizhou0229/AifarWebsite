"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function findCurrentHeading(items) {
  const headings = items
    .map((item) => {
      const element = document.getElementById(item.id);
      return element ? { id: item.id, top: element.getBoundingClientRect().top } : null;
    })
    .filter(Boolean);

  if (!headings.length) return items[0]?.id || "";

  const visible = headings
    .filter((heading) => heading.top >= 0)
    .sort((left, right) => left.top - right.top);

  if (visible[0]?.top <= window.innerHeight * 0.55) return visible[0].id;

  const passed = headings
    .filter((heading) => heading.top < 120)
    .sort((left, right) => right.top - left.top);

  return passed[0]?.id || visible[0]?.id || items[0]?.id || "";
}

export function DocumentTableOfContents({ items, labels, variant = "desktop" }) {
  const [activeId, setActiveId] = useState(items[0]?.id || "");
  const tickingRef = useRef(false);
  const visibleItems = useMemo(() => items.filter((item) => item.id && item.title), [items]);

  useEffect(() => {
    if (visibleItems.length < 2) return undefined;

    function updateActive() {
      tickingRef.current = false;
      setActiveId(findCurrentHeading(visibleItems));
    }

    function requestUpdate() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(updateActive);
    }

    const observer = new IntersectionObserver(requestUpdate, {
      rootMargin: "-96px 0px -62% 0px",
      threshold: [0, 0.2, 0.6, 1]
    });

    visibleItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    updateActive();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [visibleItems]);

  if (visibleItems.length < 2) return null;

  function jumpToHeading(event, id) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;
    setActiveId(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderList() {
    return (
      <ol className="doc-toc-list">
        {visibleItems.map((item) => (
          <li className={item.level === 3 ? "is-nested" : ""} key={item.id}>
            <a
              aria-current={activeId === item.id ? "true" : undefined}
              href={`#${item.id}`}
              onClick={(event) => jumpToHeading(event, item.id)}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    );
  }

  if (variant === "mobile") {
    return (
      <details className="doc-toc mobile">
        <summary>{labels.onThisPage}</summary>
        {renderList()}
      </details>
    );
  }

  return (
    <aside className="doc-toc desktop" aria-label={labels.onThisPage}>
      <p className="eyebrow">{labels.contents}</p>
      <h2>{labels.onThisPage}</h2>
      {renderList()}
    </aside>
  );
}
