"use client";

import React, { useEffect, useRef, useState } from "react";

export type MonacoWrapperProps = {
  language?: string;
  value?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onRun?: () => void;
};

export function MonacoWrapper({
  language = "javascript",
  value = "",
  readOnly = false,
  onChange,
  onRun,
}: MonacoWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editorValue, setEditorValue] = useState(value);
  const editorRef = useRef<unknown | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadMonaco() {
      try {
        const monaco = await import("@monaco-editor/react");
        if (!mounted) return;
        setLoaded(true);
        // render a simple Monaco editor
        // @ts-expect-error dynamic import may have different shapes
        const Editor = monaco.default;
        // We can't render the component directly here; instead we'll set a flag
        // and let JSX render it.
      } catch (err) {
        // Monaco not available; fallback to textarea
        setLoaded(false);
      }
    }

    loadMonaco();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  if (loaded) {
    // Dynamic import component locally to avoid SSR issues
    const MonacoEditor = React.lazy(() => import("@monaco-editor/react"));

    return (
      <React.Suspense fallback={<div>Loading editor…</div>}>
        <MonacoEditor
          height="400px"
          language={language}
          value={editorValue}
          options={{ readOnly }}
          onChange={(v) => {
            setEditorValue(v ?? "");
            onChange?.(v ?? "");
          }}
        />
        <div className="mt-3 flex gap-2">
          <button
            className="inline-flex items-center rounded bg-indigo-600 px-3 py-1 text-sm text-white"
            onClick={() => onRun?.()}
          >
            Run
          </button>
        </div>
      </React.Suspense>
    );
  }

  // Fallback simple textarea
  return (
    <div>
      <textarea
        className="w-full rounded border p-3 font-mono text-sm"
        style={{ minHeight: 300 }}
        value={editorValue}
        readOnly={readOnly}
        onChange={(e) => {
          setEditorValue(e.target.value);
          onChange?.(e.target.value);
        }}
      />
      <div className="mt-3 flex gap-2">
        <button
          className="inline-flex items-center rounded bg-indigo-600 px-3 py-1 text-sm text-white"
          onClick={() => onRun?.()}
        >
          Run
        </button>
      </div>
    </div>
  );
}
