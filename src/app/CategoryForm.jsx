/**
 * Making a category.
 *
 * Only the name is required. The colour is not a choice you must make — one is
 * assigned, the presets are a shortcut, and any colour at all is allowed
 * through the picker. The icon is optional too.
 */

import { useState } from "react";
import Icon from "./Icon.jsx";
import { CATEGORY_COLORS, CATEGORY_ICONS, colorOf, iconOf } from "../patterns.mjs";

export default function CategoryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(colorOf(initial?.color));
  const [icon, setIcon] = useState(initial?.icon ?? null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), color, icon });
      }}
    >
      <div className="field">
        <label htmlFor="cn">Name</label>
        <input
          id="cn"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="School, home, errands…"
          autoFocus
        />
      </div>

      <div className="field">
        <label>
          Colour <span className="opt">optional — one is already chosen</span>
        </label>
        <div className="swatches">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${color.toLowerCase() === c.toLowerCase() ? " on" : ""}`}
              style={{ "--c": c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
          {/* any colour, not just the presets */}
          <label className="swatch custom" title="Any colour">
            <Icon name="plus" size={14} />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Custom colour"
            />
          </label>
        </div>
      </div>

      <div className="field">
        <label>
          Icon <span className="opt">optional</span>
        </label>
        <div className="iconset">
          {CATEGORY_ICONS.map((k) => (
            <button
              key={k}
              type="button"
              className={`ipick${icon === k ? " on" : ""}`}
              style={{ "--c": color }}
              onClick={() => setIcon(icon === k ? null : k)}
              aria-label={k}
              title={k}
            >
              <Icon name={k} size={17} />
            </button>
          ))}
        </div>
      </div>

      <div className="preview">
        <span className="pill lg" style={{ "--c": color }}>
          <Icon name={iconOf(icon)} size={13} />
          {name.trim() || "Untitled"}
        </span>
      </div>

      <div className="btnrow" style={{ marginTop: "var(--sp-4)" }}>
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          <Icon name="check" size={15} />
          {initial ? "Save" : "Create"}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
