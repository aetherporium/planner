/**
 * A popup view — a window over the page, sized to its content.
 *
 * This is what "opening" something looks like: the page stays visible behind
 * it, and you close it rather than navigate back. It never touches the hash,
 * so it is not part of history. See ADR-0019.
 */

import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export default function Popup({ title, sub, onClose, children, footer, size = "md" }) {
  const ref = useRef(null);

  /**
   * The close handler is nearly always written inline at the call site, so a
   * new function arrives on every render of the page behind us — and the page
   * re-renders once a second to keep the clock live. Held in a ref, the
   * listeners below can be bound once instead of being torn down and rebuilt
   * on every tick.
   */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    const onHash = () => closeRef.current();
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  /**
   * Focus moves to the dialog when it opens — once. This used to sit in the
   * effect above, which re-ran every second along with the clock, and so it
   * stole the caret back out of whatever field you were typing in about as
   * fast as you could type. Opening focuses; typing is then left alone.
   */
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="pop-scrim" onClick={onClose}>
      <div
        className={`pop pop-${size} glass`}
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
