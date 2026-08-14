/**
 * Icons. No emoji anywhere in this app — emoji render differently on every
 * platform and cannot inherit colour or stroke weight. These are line icons on
 * a 20x20 grid using `currentColor`, so they take the colour of their context.
 */

const P = {
  calendar:
    "M4 5.5h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 16 17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5ZM6.5 3v4M13.5 3v4M2.5 9.5h15",
  clock: "M10 5.5V10l3 2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  check: "M4.5 10.5 8 14l7.5-8",
  cross: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  chevRight: "M8 5l5 5-5 5",
  chevLeft: "M12 5l-5 5 5 5",
  chevDown: "M5 8l5 5 5-5",
  arrowLeft: "M16 10H4m0 0 5-5m-5 5 5 5",
  pin: "M10 17.5s5.5-5 5.5-9a5.5 5.5 0 1 0-11 0c0 4 5.5 9 5.5 9ZM10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  rest: "M3 12.5h4l2-4 2 8 2-4h4",
  travel: "M3 14.5h3l3.5-9h2l-1.5 9H17M6.5 17.5h9",
  repeat: "M4 8.5A4.5 4.5 0 0 1 8.5 4H16m0 0-2.5-2.5M16 4l-2.5 2.5M16 11.5A4.5 4.5 0 0 1 11.5 16H4m0 0 2.5 2.5M4 16l2.5-2.5",
  layers: "M10 2.5 2.5 6.5 10 10.5l7.5-4L10 2.5ZM2.5 10.5 10 14.5l7.5-4M2.5 14.5 10 18.5l7.5-4",
  plus: "M10 4.5v11M4.5 10h11",
  warn: "M10 3.5 2.5 16.5h15L10 3.5ZM10 8v3.5M10 14.2v.3",
  log: "M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 16V5A1.5 1.5 0 0 1 6 3.5ZM7.5 7.5h5M7.5 10.5h5M7.5 13.5h3",
  sun: "M10 3V1.5M10 18.5V17M17 10h1.5M1.5 10H3M14.9 5.1l1-1M4.1 15.9l1-1M14.9 14.9l1 1M4.1 4.1l1 1M13.5 10a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
  moon: "M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z",
  edit: "M13.5 3.5l3 3-9 9-4 1 1-4 9-9ZM12 5l3 3",
  trash: "M4 6h12M8 6V4h4v2M6 6l.8 10.1a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9L14 6",
  dots: "M5 10h.01M10 10h.01M15 10h.01",
  off: "M10 3v7M14.5 5.5a6 6 0 1 1-9 0",
  bar: "M4 16.5V11M8 16.5V6.5M12 16.5V9M16 16.5V4.5",
  today: "M4 5.5h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 16 17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5ZM6.5 3v4M13.5 3v4M2.5 9.5h15M10 12.5v2.2",
};

export default function Icon({ name, size = 16, style, className, strokeWidth = 1.6 }) {
  const d = P[name];
  if (!d) return null;
  const round = name === "dots";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={round ? 2.4 : strokeWidth}
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
