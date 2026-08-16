/**
 * The register of open design questions.
 *
 * Every prototype is listed here and nowhere else. Go anywhere reads this, so
 * a prototype is never something you have to know the URL for — searching
 * "prototype" finds all of them, and searching what they are about finds the
 * relevant one.
 *
 * When a question is answered: build the winner properly, delete its entry
 * here, delete its variants, and write the ADR. An empty list means no open
 * questions, and the section disappears on its own.
 */

export const PROTOTYPES = [
  {
    id: "form",
    title: "Task form",
    question: "What shape should creating a task be?",
    variants: [
      ["A", "Ladder — everything on one page"],
      ["B", "Steps — three gates"],
      ["C", "Sentence — fill in the blanks"],
    ],
    // words that should find it
    terms: ["form", "task", "add", "create", "new", "field", "frequency", "date"],
  },
  {
    id: "addbtn",
    title: "New task button",
    question: "How loud should the add button be on Blueprints?",
    variants: [
      ["A", "Quiet — a plain button in the row"],
      ["B", "Split — text, with a caption"],
      ["C", "Icon — round, floating bottom-right"],
      ["D", "First card — a square in the strip"],
    ],
    terms: ["button", "add", "new", "task", "blueprint", "cta", "plus"],
  },
];

export const findPrototype = (id) => PROTOTYPES.find((p) => p.id === id) ?? null;

/** Every prototype variant as a searchable destination. */
export const prototypeHits = (q) => {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const out = [];

  for (const p of PROTOTYPES) {
    const hay = [p.title, p.question, ...p.terms].join(" ").toLowerCase();
    const wantsAll = "prototype".startsWith(s) || s === "proto";
    if (!wantsAll && !hay.includes(s)) continue;

    for (const [key, label] of p.variants) {
      out.push({
        kind: "Prototype",
        label: `${p.title} — ${key}`,
        sub: label,
        why: p.question,
        href: `#/prototype/${p.id}/${key}`,
      });
    }
  }
  return out;
};
