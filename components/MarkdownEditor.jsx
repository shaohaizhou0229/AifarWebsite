"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";

export function MarkdownEditor({ id, value, onChange, labels }) {
  const [mode, setMode] = useState("visual");

  return (
    <div className="markdown-editor-shell">
      <div className="markdown-editor-topbar">
        <div>
          <p className="eyebrow">{labels.editorTitle}</p>
          <h3>{labels.editorHeading}</h3>
        </div>
        <div className="segmented-control" role="tablist" aria-label={labels.editorMode}>
          {[
            ["visual", labels.visualMode],
            ["source", labels.sourceMode],
            ["preview", labels.previewMode]
          ].map(([key, label]) => (
            <button
              aria-selected={mode === key}
              key={key}
              onClick={() => setMode(key)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "visual" ? (
        <MilkdownVisualEditor value={value} onChange={onChange} labels={labels} />
      ) : null}

      {mode === "source" ? (
        <textarea
          aria-label={labels.markdownContent}
          className="markdown-textarea"
          id={id}
          name="markdownContent"
          onChange={(event) => onChange(event.target.value)}
          required
          value={value}
        />
      ) : null}

      {mode === "preview" ? (
        <div className="markdown-preview-panel">
          {value.trim() ? <MarkdownContent content={value} /> : <p className="muted-line">{labels.emptyPreview}</p>}
        </div>
      ) : null}
    </div>
  );
}

function MilkdownVisualEditor({ value, onChange, labels }) {
  const rootRef = useRef(null);
  const crepeRef = useRef(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let isMounted = true;

    async function createEditor() {
      if (!rootRef.current) return;
      setIsReady(false);
      setLoadError("");

      try {
        const { Crepe, CrepeFeature } = await import("@milkdown/crepe");
        const crepe = new Crepe({
          root: rootRef.current,
          defaultValue: valueRef.current || "",
          features: {
            [CrepeFeature.AI]: false
          },
          featureConfigs: {
            [CrepeFeature.Placeholder]: {
              text: labels.editorPlaceholder,
              mode: "doc"
            }
          }
        });

        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown) => {
            valueRef.current = markdown;
            onChangeRef.current(markdown);
          });
        });

        crepeRef.current = crepe;
        await crepe.create();
        if (isMounted) setIsReady(true);
      } catch (error) {
        if (isMounted) setLoadError(error?.message || labels.editorLoadFailed);
      }
    }

    createEditor();

    return () => {
      isMounted = false;
      const crepe = crepeRef.current;
      crepeRef.current = null;
      if (crepe) {
        crepe.destroy().catch(() => {});
      }
    };
  }, [labels.editorLoadFailed, labels.editorPlaceholder]);

  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe || !isReady) return;
    if (crepe.getMarkdown() === value) return;

    async function refreshEditor() {
      setIsReady(false);
      const { replaceAll } = await import("@milkdown/utils");
      crepe.editor.action(replaceAll(value || "", true));
      setIsReady(true);
    }

    refreshEditor().catch((error) => setLoadError(error?.message || labels.editorLoadFailed));
  }, [isReady, labels.editorLoadFailed, value]);

  return (
    <div className="milkdown-editor-frame">
      {!isReady && !loadError ? <p className="editor-loading">{labels.editorLoading}</p> : null}
      {loadError ? <p className="form-message error">{loadError}</p> : null}
      <div className="milkdown-editor" ref={rootRef} />
    </div>
  );
}
