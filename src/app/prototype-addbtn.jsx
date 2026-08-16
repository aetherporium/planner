/**
 * PROTOTYPE — throwaway. Delete once a variant wins.
 *
 * Question: the New task button is the loudest thing on Blueprints. It is
 *           big, filled, top-right, and it pulls the eye before the content
 *           does. It is the most important action on the page, but the page
 *           is for looking at what you already have.
 *
 * So: how loud should it be? Four answers, each a real trade.
 *
 *   A — Quiet.      Same size and weight as Settings, just accented text.
 *                   Calmest; risks being missed by someone new.
 *   B — Split.      Text button, no caption, accent border not accent fill.
 *                   Reads as primary without shouting.
 *   C — Icon.       Round, floating bottom-right, out of the reading path
 *                   entirely. Always reachable; a known pattern; but it
 *                   collides with the go-anywhere pill.
 *   D — First card. A square at the head of the categories strip, so adding
 *                   sits among the things it makes. Most cohesive; least
 *                   obviously a primary action, and only visible near a strip.
 *
 * Each variant renders the real page header and strip so the button is judged
 * in place, not on a blank canvas.
 */

import Icon from "./Icon.jsx";
import { colorOf, iconOf } from "../patterns.mjs";

const DEMO_CATS = [
  { name: "School", color: "#2c6fb5", icon: "book" },
  { name: "Home", color: "#2f8f74", icon: "home" },
  { name: "Work", color: "#6b4fc4", icon: "work" },
  { name: "Health", color: "#b23b57", icon: "heart" },
  { name: "Errands", color: "#b5761f", icon: "cart" },
];

const Strip = ({ lead }) => (
  <section className="shelf">
    <h2 className="section centered">Categories</h2>
    <p className="shelf-note">Optional. Group tasks however you like.</p>
    <div className="card-strip">
      {lead}
      <button className="sq sq-new" aria-label="New category" type="button">
        <Icon name="plus" size={22} />
      </button>
      {DEMO_CATS.map((c) => (
        <button key={c.name} className="sq sq-cat" style={{ "--c": colorOf(c.color) }} type="button">
          <span className="sq-badge"><Icon name={iconOf(c.icon)} size={16} /></span>
          <span className="sq-n">{c.name}</span>
          <span className="sq-c">4 tasks</span>
        </button>
      ))}
    </div>
  </section>
);

const Rows = () => (
  <div className="bp-bottom" style={{ marginTop: "var(--sp-5)" }}>
    <h2 className="section" style={{ margin: "0 0 var(--sp-3)" }}>All tasks <span className="dim">(5)</span></h2>
    <div className="tbl">
      {[
        ["12:00", "Wake", "moment"],
        ["1:00", "Breakfast", "30 min"],
        ["6:30", "Lunch", "45 min"],
        ["1:30", "Dinner", "45 min"],
        ["4:30", "Sleep", "7.5 hr"],
      ].map(([t, n, d]) => (
        <span className="trow" key={n} style={{ gridTemplateColumns: "74px 1fr 72px" }}>
          <span className="tc-time">{t}</span>
          <span className="tc-name">{n}</span>
          <span className="tc-dur">{d}</span>
        </span>
      ))}
    </div>
  </div>
);

/* A — quiet: no more weight than anything else in the row */
const A = () => (
  <>
    <div className="bp-hero">
      <h1 className="title">Blueprints</h1>
      <div className="btnrow">
        <button className="btn" type="button"><Icon name="settings" size={15} />Settings</button>
        <button className="btn quiet-add" type="button"><Icon name="plus" size={15} />New task</button>
      </div>
    </div>
    <div className="bp-top"><Strip /></div>
    <Rows />
  </>
);

/* B — split: clearly primary, but outlined rather than filled */
const B = () => (
  <>
    <div className="bp-hero">
      <h1 className="title">Blueprints</h1>
      <div className="btnrow">
        <button className="btn" type="button"><Icon name="settings" size={15} />Settings</button>
        <button className="btn outline-add" type="button"><Icon name="plus" size={16} />New task</button>
      </div>
    </div>
    <div className="bp-top"><Strip /></div>
    <Rows />
  </>
);

/* C — icon: out of the reading path entirely */
const C = () => (
  <>
    <div className="bp-hero">
      <h1 className="title">Blueprints</h1>
      <div className="btnrow">
        <button className="btn" type="button"><Icon name="settings" size={15} />Settings</button>
      </div>
    </div>
    <div className="bp-top"><Strip /></div>
    <Rows />
    <button className="fab" type="button" aria-label="New task" title="New task">
      <Icon name="plus" size={22} />
    </button>
    <p className="hint proto-note">
      Note: this sits where the go-anywhere pill already lives. Shown offset so both are visible.
    </p>
  </>
);

/* D — first card: adding lives among the things it makes */
const D = () => (
  <>
    <div className="bp-hero">
      <h1 className="title">Blueprints</h1>
      <div className="btnrow">
        <button className="btn" type="button"><Icon name="settings" size={15} />Settings</button>
      </div>
    </div>
    <div className="bp-top">
      <Strip
        lead={
          <button className="sq sq-add" type="button">
            <span className="sq-badge add"><Icon name="plus" size={18} /></span>
            <span className="sq-n">New task</span>
            <span className="sq-c">Plan something</span>
          </button>
        }
      />
    </div>
    <Rows />
  </>
);

export default function AddButtonPrototype({ variant = "A" }) {
  const V = { A, B, C, D }[variant] ?? A;
  return <V />;
}
