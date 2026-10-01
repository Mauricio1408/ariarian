// Motion tokens — Obsidian Vault/AriArian/Motion Tokens.md
// One easing curve for everything. It reads as calm because nothing competes.

export const EASE = [0.32, 0.72, 0, 1] as const;

export const T = {
  hover: { duration: 0.12, ease: EASE },
  state: { duration: 0.2, ease: EASE },
  swap: { duration: 0.22, ease: EASE },
  page: { duration: 0.24, ease: EASE },
  overlay: { duration: 0.26, ease: EASE },
  slow: { duration: 0.7, ease: EASE },
  spring: { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.9 },
  soft: { type: "spring" as const, stiffness: 260, damping: 30 },
};

export const stagger = (i: number, step = 0.035, base = 0) => ({ ...T.page, delay: base + i * step });
