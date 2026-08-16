/**
 * A month you can point at. Used in the go-anywhere panel and in the popup
 * the day header opens — same component, so the two never drift apart.
 */

import { useState } from "react";
import Icon from "./Icon.jsx";
import { ecMonthDays, DOW, GC_MONTHS } from "../calendar.mjs";

const EC_M_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];
const DOW_AM_2 = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

export default function MiniCalendar({ now, focus, onPick }) {
  const [view, setView] = useState({ y: focus.ec.y, m: focus.ec.m });
  const days = ecMonthDays(view.y, view.m);
  const lead = days.length ? days[0].dow : 0;

  const shift = (n) => {
    const m = view.m + n;
    if (m < 1) setView({ y: view.y - 1, m: 13 });
    else if (m > 13) setView({ y: view.y + 1, m: 1 });
    else setView({ ...view, m });
  };

  return (
    <div className="mini">
      <div className="mini-head">
        <button type="button" className="stepper" onClick={() => shift(-1)} aria-label="Previous month">
          <Icon name="chevLeft" size={15} />
        </button>
        <span className="mini-title">
          <span className="am">{EC_M_AM[view.m - 1]}</span> <span className="dim">{view.y}</span>
        </span>
        <button type="button" className="stepper" onClick={() => shift(1)} aria-label="Next month">
          <Icon name="chevRight" size={15} />
        </button>
      </div>

      <div className="mini-grid">
        {DOW_AM_2.map((d, i) => (
          <span key={d} className="mini-dow am" title={DOW[i]}>{d}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {days.map((d) => (
          <button
            key={d.jdn}
            type="button"
            className={[
              "mini-day",
              d.jdn === now.jdn ? "today" : "",
              d.jdn === focus.jdn ? "on" : "",
              d.holidays.length ? "hol" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => onPick(d.jdn)}
            title={`${DOW[d.dow]} ${d.gc.d} ${GC_MONTHS[d.gc.m - 1]}${
              d.holidays.length ? ` · ${d.holidays.join(", ")}` : ""
            }`}
          >
            <span className="am">{d.ec.d}</span>
            <small>{d.gc.d}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
