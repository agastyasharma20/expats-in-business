// Motion tokens (CLAUDE.md animation rules). Animate only transform and opacity.
export const ease = [0.22, 1, 0.36, 1] as const;

export const duration = {
  micro: 0.15,
  page: 0.2,
  entrance: 0.5,
  success: 0.5,
  counter: 1.2,
} as const;

export const stagger = 0.06;

export const spring = { type: "spring", stiffness: 260, damping: 30 } as const;
