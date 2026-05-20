"use client";

import { useEffect, useState } from "react";
import { DocLink } from "@/components/Rows";
import { localizedPath } from "@/i18n/routing";

function localCategory(page, category) {
  return {
    ...category,
    label: page.categories?.[category.key]?.label || category.label,
    description: page.categories?.[category.key]?.description || category.description
  };
}

export function DocumentHub({ locale, page, initialCategories = [], initialDocuments = [] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [documents, setDocuments] = useState(initialDocuments);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/docs/");
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled) {
          setCategories(result.categories || initialCategories);
          setDocuments(result.documents || initialDocuments);
        }
      } catch {
        // Keep the cached public document list visible if the session-aware request fails.
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [initialCategories, initialDocuments]);

  return (
    <div className="section-inner document-hub">
      {categories.map((category) => {
        const localizedCategory = localCategory(page, category);
        const categoryDocs = documents.filter((document) => document.categoryKey === category.key);

        return (
          <section className="document-category" key={category.key}>
            <div className="section-head compact">
              <div>
                <p className="eyebrow">{localizedCategory.label}</p>
                <h2>{localizedCategory.label}</h2>
                <p>{localizedCategory.description}</p>
              </div>
              <span className="pill">{category.requiresLoginToView ? page.loginRequired : page.publicReadable}</span>
            </div>
            <div className="doc-list">
              {categoryDocs.map((document) => (
                <DocLink
                  key={document.id}
                  title={document.title}
                  description={document.summary || page.noSummary}
                  pill={document.currentVersionLabel || page.noVersion}
                  href={localizedPath(locale, `/docs/${document.slug}/`)}
                />
              ))}
              {!categoryDocs.length ? <p className="muted-line">{page.emptyCategory}</p> : null}
            </div>
          </section>
        );
      })}
      {!documents.length ? (
        <div className="doc-list">
          {page.items.map(([title, description, pill]) => (
            <DocLink key={title} title={title} description={description} pill={pill} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
