/**
 * The frame every prototype is shown in.
 *
 * It is deliberately not the app chrome: a marked banner, the question being
 * asked, and a switcher. You should never be unsure whether you are looking at
 * the real thing.
 */

import Icon from "./Icon.jsx";
import { findPrototype } from "./prototypes.js";
import FormPrototype from "./prototype-form.jsx";
import AddButtonPrototype from "./prototype-addbtn.jsx";

const RENDER = {
  form: (p) => <FormPrototype {...p} />,
  addbtn: (p) => <AddButtonPrototype variant={p.variant} />,
};

export default function PrototypeShell({ proto, variant, planner, now }) {
  const meta = findPrototype(proto);
  if (!meta) {
    return (
      <div className="shell proto">
        <p className="empty">No prototype called “{proto}”.</p>
        <a className="btn" href="#/settings">Back to settings</a>
      </div>
    );
  }

  const keys = meta.variants.map(([k]) => k);
  const i = Math.max(0, keys.indexOf(variant));
  const to = (n) => `#/prototype/${meta.id}/${keys[(n + keys.length) % keys.length]}`;

  return (
    <div className="shell proto">
      <div className="proto-bar">
        <span className="proto-tag">Prototype · throwaway</span>
        <a className="linkline" href="#/settings">
          <Icon name="arrowLeft" size={14} /> Leave
        </a>
      </div>

      <h1 className="title" style={{ marginBottom: 4 }}>{meta.title}</h1>
      <p className="sub" style={{ marginBottom: "var(--sp-5)" }}>{meta.question}</p>

      <div className="proto-stage">{RENDER[meta.id]({ variant, planner, now })}</div>

      <div className="switcher">
        <a className="sw-arrow" href={to(i - 1)} aria-label="Previous variant">
          <Icon name="chevLeft" size={15} />
        </a>
        <span className="sw-label">
          <strong>{keys[i]}</strong> {meta.variants[i][1]}
        </span>
        <a className="sw-arrow" href={to(i + 1)} aria-label="Next variant">
          <Icon name="chevRight" size={15} />
        </a>
        <span className="sw-count">{i + 1}/{keys.length}</span>
      </div>
    </div>
  );
}
