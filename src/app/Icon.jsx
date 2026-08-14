/**
 * Icons — drawn for what they actually mean here.
 *
 * No stacked-layers, no boxes-in-boxes, no generic dashboard furniture. A
 * pattern is a repeating mark; a category is a labelled tag; a day is a sun
 * over a horizon. Line art on a 20x20 grid using `currentColor`.
 */

const P = {
  // time
  clock: "M10 5.5V10l3 2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  sunrise: "M10 3.5v3.5M4.7 6.7l1.6 1.6M15.3 6.7l-1.6 1.6M2.5 14.5h15M6 14.5a4 4 0 0 1 8 0M4.5 17.5h11",
  moon: "M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z",
  sun: "M10 3V1.5M10 18.5V17M17 10h1.5M1.5 10H3M14.9 5.1l1-1M4.1 15.9l1-1M14.9 14.9l1 1M4.1 4.1l1 1M13.5 10a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",

  // dates
  calendar: "M4 5.5h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 16 17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5ZM6.5 3v4M13.5 3v4M2.5 9.5h15",
  day: "M4 5.5h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 16 17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5ZM6.5 3v4M13.5 3v4M2.5 9.5h15M10 12.5v2.5",

  // a pattern is a rhythm: marks repeating at an interval
  pattern: "M3 10h2.5M9 10h2.5M15 10h2.5M4.25 6.5v7M10.25 6.5v7M16.25 6.5v7",
  // a category is a tag you attach
  tag: "M3.5 3.5h5.2a1 1 0 0 1 .7.3l7 7a1 1 0 0 1 0 1.4l-4.5 4.5a1 1 0 0 1-1.4 0l-7-7a1 1 0 0 1-.3-.7V3.5ZM6.5 6.5h.01",

  // actions
  check: "M4.5 10.5 8 14l7.5-8",
  cross: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  plus: "M10 4.5v11M4.5 10h11",
  edit: "M13.5 3.5l3 3-9 9-4 1 1-4 9-9ZM12 5l3 3",
  trash: "M4 6h12M8 6V4h4v2M6 6l.8 10.1a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9L14 6",
  off: "M10 3v7M14.5 5.5a6 6 0 1 1-9 0",
  // moving a task is an arc, not a refresh spinner
  move: "M4 13.5c0-5 3.5-8 8.5-8M12.5 5.5 9.5 3M12.5 5.5 9.5 8",

  // direction
  chevRight: "M8 5l5 5-5 5",
  chevLeft: "M12 5l-5 5 5 5",
  chevDown: "M5 8l5 5 5-5",
  arrowLeft: "M16 10H4m0 0 5-5m-5 5 5 5",
  arrowUp: "M10 16V4m0 0-5 5m5-5 5 5",

  // place and the space between places
  pin: "M10 17.5s5.5-5 5.5-9a5.5 5.5 0 1 0-11 0c0 4 5.5 9 5.5 9ZM10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  travel: "M3.5 15.5h3l3-11h2l-1.5 11H17",
  rest: "M3 12.5h3l2-4 2 8 2-4h5",

  warn: "M10 3.5 2.5 16.5h15L10 3.5ZM10 8v3.5M10 14.2v.3",
  note: "M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 16V5A1.5 1.5 0 0 1 6 3.5ZM7.5 7.5h5M7.5 10.5h5M7.5 13.5h3",
  search: "M13.5 13.5 17 17M15.5 9a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
  dots: "M5 10h.01M10 10h.01M15 10h.01",
};

export default function Icon({ name, size = 16, style, className, strokeWidth = 1.6 }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "dots" ? 2.4 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      <path d={d} />
    </svg>
  );
}
