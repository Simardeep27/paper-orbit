"use client";

import { useId, useState } from "react";

interface YearInputProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  label: string;
  placeholder?: string;
  id?: string;
}

export function YearInput({
  value,
  onCommit,
  label,
  placeholder = "Any",
  id,
}: YearInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      if (value !== null) onCommit(null);
      setDraft("");
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 1000 && parsed <= 3000) {
      if (parsed !== value) onCommit(parsed);
      setDraft(String(parsed));
    } else {
      setDraft(value === null ? "" : String(value));
    }
  }

  return (
    <span>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className="input"
        type="number"
        inputMode="numeric"
        min={1000}
        max={3000}
        step={1}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(value === null ? "" : String(value));
            event.currentTarget.blur();
          }
        }}
      />
    </span>
  );
}
