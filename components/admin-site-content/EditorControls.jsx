import { Plus, Trash2 } from "lucide-react";

function normalizeRows(value, columns) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => {
    const next = Array.isArray(row) ? [...row] : [];
    while (next.length < columns) next.push("");
    return next.slice(0, columns);
  });
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, multiline = false }) {
  if (multiline) {
    return <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  }
  return <input value={value || ""} onChange={(event) => onChange(event.target.value)} />;
}

export function RowEditor({ labels, rows, columns, placeholders, onChange }) {
  const safeRows = normalizeRows(rows, columns);

  function updateCell(rowIndex, cellIndex, value) {
    const next = safeRows.map((row) => [...row]);
    next[rowIndex][cellIndex] = value;
    onChange(next);
  }

  function addRow() {
    onChange([...safeRows, Array.from({ length: columns }, () => "")]);
  }

  function removeRow(rowIndex) {
    onChange(safeRows.filter((_, index) => index !== rowIndex));
  }

  return (
    <div className="builder-row-editor">
      {safeRows.map((row, rowIndex) => (
        <div className={`builder-row columns-${columns}`} key={`row-${rowIndex}`}>
          {row.map((cell, cellIndex) => (
            <input
              key={`cell-${cellIndex}`}
              value={cell || ""}
              aria-label={placeholders[cellIndex]}
              placeholder={placeholders[cellIndex]}
              onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
            />
          ))}
          <button className="icon-button danger" type="button" onClick={() => removeRow(rowIndex)} title={labels.removeItem}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button className="button secondary compact" type="button" onClick={addRow}>
        <Plus size={15} aria-hidden="true" />
        {labels.addItem}
      </button>
    </div>
  );
}
