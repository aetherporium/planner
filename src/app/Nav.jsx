/**
 * Navigation — one anchor at the thumb, three spokes on fixed arcs.
 *
 * Promoted from prototype variant C. Chosen over the directory style because
 * the destinations never move: after a day of use the hand goes to the right
 * place without reading anything. It costs one dot of permanent furniture,
 * which is the whole price.
 *
 * The variants that lost are still browsable at #/prototype/<A|B|C>.
 */

import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";

const SPOKES = [
  { icon: "day", label: "Today", href: "#/", angle: 198 },
  { icon: "calendar", label: "Calendar", href: "#/calendar", angle: 249 },
  { icon: "pattern", label: "Blueprints", href: "#/blueprints", angle: 300 },
];

export default function Nav({ here }) {
  const [open, setOpen] = useState(false);

  // Escape closes; the hash changing closes it too, since you have arrived.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onHash = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  return (
    <>
      {open ? <div className="nav-scrim" onClick={() => setOpen(false)} /> : null}
      <nav className={`orbit${open ? " open" : ""}`}>
        {SPOKES.map((s, i) => {
          const a = (s.angle * Math.PI) / 180;
          const current = here === s.href;
          return (
            <a
              key={s.href}
              className={`spoke${current ? " current" : ""}`}
              href={s.href}
              style={{
                transform: open
                  ? `translate(${Math.cos(a) * 80}px, ${Math.sin(a) * 80}px)`
                  : "translate(0,0) scale(0.4)",
                transitionDelay: `${open ? i * 40 : 0}ms`,
              }}
              tabIndex={open ? 0 : -1}
              aria-hidden={!open}
            >
              <Icon name={s.icon} size={18} />
              <span className="spoke-l">{s.label}</span>
            </a>
          );
        })}
        <button
          className="anchor"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          <Icon name={open ? "cross" : "compass"} size={20} />
        </button>
      </nav>
    </>
  );
}
