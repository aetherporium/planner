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

  // a pattern is a rhythm — a wave that keeps returning
  pattern: "M2.5 10c1.5-4 3.5-4 5 0s3.5 4 5 0 3.5-4 5 0",
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
  arrowDown: "M10 4v12m0 0 5-5m-5 5-5-5",

  // place and the space between places
  pin: "M10 17.5s5.5-5 5.5-9a5.5 5.5 0 1 0-11 0c0 4 5.5 9 5.5 9ZM10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  travel: "M3.5 15.5h3l3-11h2l-1.5 11H17",
  rest: "M3 12.5h3l2-4 2 8 2-4h5",

  warn: "M10 3.5 2.5 16.5h15L10 3.5ZM10 8v3.5M10 14.2v.3",
  note: "M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 16V5A1.5 1.5 0 0 1 6 3.5ZM7.5 7.5h5M7.5 10.5h5M7.5 13.5h3",
  search: "M13.5 13.5 17 17M15.5 9a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
  settings: "M8.2 3.3a1 1 0 0 1 1-.8h1.6a1 1 0 0 1 1 .8l.2 1.2 1.3.7 1.1-.5a1 1 0 0 1 1.2.4l.8 1.4a1 1 0 0 1-.2 1.2l-.9.8v1.6l.9.8a1 1 0 0 1 .2 1.2l-.8 1.4a1 1 0 0 1-1.2.4l-1.1-.5-1.3.7-.2 1.2a1 1 0 0 1-1 .8H9.2a1 1 0 0 1-1-.8L8 15.3l-1.3-.7-1.1.5a1 1 0 0 1-1.2-.4l-.8-1.4a1 1 0 0 1 .2-1.2l.9-.8V9.7l-.9-.8a1 1 0 0 1-.2-1.2l.8-1.4a1 1 0 0 1 1.2-.4l1.1.5L8 5.7ZM12 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  text: "M4 5.5h12M4 10h12M4 14.5h7",
  minus: "M4.5 10h11",
  water: "M10 2.8s5.5 6 5.5 9.4a5.5 5.5 0 0 1-11 0C4.5 8.8 10 2.8 10 2.8Z",
  gauge: "M4 14a6.5 6.5 0 1 1 12 0M10 13.5 13 8.5",
  list: "M6.5 5.5h10M6.5 10h10M6.5 14.5h10M3.4 5.5h.01M3.4 10h.01M3.4 14.5h.01",

  // category icon set
  book: "M4 4.5A1.5 1.5 0 0 1 5.5 3H15v13H5.5A1.5 1.5 0 0 0 4 17.5v-13ZM4 16.5A1.5 1.5 0 0 1 5.5 15H15v2.5H5.5A1.5 1.5 0 0 1 4 16Z",
  home: "M3 9.2 10 3.5l7 5.7M5 8.2v8.3h10V8.2M8.5 16.5v-4.6h3v4.6",
  work: "M3 7.5h14v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8ZM7.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5M3 11h14",
  cart: "M2.5 3.5h2l2 9h8l2-6.5h-11M8 16.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM15 16.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  heart: "M10 16.5S3 12.3 3 7.9A3.4 3.4 0 0 1 10 6a3.4 3.4 0 0 1 7 1.9c0 4.4-7 8.6-7 8.6Z",
  run: "M11.5 3.8a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0ZM9 7l-2.5 2 1 3-2 4.5M9 7l3 1.5.8 3.2 2.2 2M9 7 6 8",
  music: "M7.5 15V5.5l8-1.5v9M7.5 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM15.5 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  food: "M5 3v6a2 2 0 0 0 4 0V3M7 11v6M14 3c-1.5 1-2 2.5-2 4.5s.5 3 2 3.5v6",
  money: "M10 4v12M12.8 6.5a3 3 0 0 0-2.8-1.3c-1.7 0-2.8.9-2.8 2.2 0 3 5.8 1.6 5.8 4.7 0 1.4-1.2 2.3-3 2.3a3.3 3.3 0 0 1-3-1.5",
  people: "M8 8.5a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM3 16.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2M14 5.2a2.2 2.2 0 0 1 0 4.3M15.5 12.5c1.2.7 1.9 1.9 1.9 3.3",
  leaf: "M16.5 3.5c0 7-4 11-9 11a4 4 0 0 1-4-4c0-5 5-6.5 13-7ZM8 15c1-4 3.5-7 6.5-9",
  star: "m10 3 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4L5.5 16.7l.9-5L2.8 8.2l5-.7L10 3Z",
  tool: "m12.5 7.5 4-4a4 4 0 0 1-5.3 5.3l-5.5 5.5a1.6 1.6 0 1 1-2.3-2.3l5.5-5.5A4 4 0 0 1 14.2 1M13 11.5l3.5 3.5a1.6 1.6 0 0 1-2.3 2.3l-3-3",
  phone: "M6.5 2.5h7a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V4a1.5 1.5 0 0 1 1.5-1.5ZM9 15h2",
  pen: "M13.5 3.5l3 3-9 9-4 1 1-4 9-9ZM12 5l3 3",
  globe: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM3.2 8.5h13.6M3.2 11.5h13.6M10 3a12 12 0 0 1 0 14 12 12 0 0 1 0-14Z",
  // navigation anchor: a needle, not a hamburger
  compass: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12.7 7.3l-1.5 3.9-3.9 1.5 1.5-3.9 3.9-1.5Z",
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
