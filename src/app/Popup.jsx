/**
 * A popup view — a window over the page, sized to its content.
 *
 * This is what "opening" something looks like: the page stays visible behind
 * it, and you close it rather than navigate back. It never touches the hash,
 * so it is not part of history. See ADR-0019.
 */

import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export default function Popup({ title, sub, onClose, children, footer, width = 460 }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const onHash = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    ref.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, [onClose]);

  return (
    <div className="pop-scrim" onClick={onClose}>
      <div
        className="pop glass"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="pop-head">
          <div className="pop-titles">
            <span className="pop-title">{title}</span>
            {sub ? <span className="pop-sub">{sub}</span> : null}
          </div>
          <button className="pop-x" onClick={onClose} aria-label="Close">
            <Icon name="cross" size={15} />
          </button>
        </div>
        <div className="pop-body">{children}</div>
        {footer ? <div className="pop-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
