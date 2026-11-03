export const BLOOD_GROUPS = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'] as const;
export type BG = (typeof BLOOD_GROUPS)[number];

/**
 * Deterministic red-cell compatibility table: recipient group -> donor groups that may donate.
 * This is a screening/matching aid only. Final compatibility (cross-match, antibodies, component type)
 * is always decided by the hospital / blood bank clinical team. AI is never involved in this decision.
 */
const DONORS_FOR: Record<BG, BG[]> = {
  O_NEG: ['O_NEG'],
  O_POS: ['O_POS', 'O_NEG'],
  A_NEG: ['A_NEG', 'O_NEG'],
  A_POS: ['A_POS', 'A_NEG', 'O_POS', 'O_NEG'],
  B_NEG: ['B_NEG', 'O_NEG'],
  B_POS: ['B_POS', 'B_NEG', 'O_POS', 'O_NEG'],
  AB_NEG: ['AB_NEG', 'A_NEG', 'B_NEG', 'O_NEG'],
  AB_POS: ['AB_POS', 'AB_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG']
};

export function isBloodGroup(v: unknown): v is BG {
  return typeof v === 'string' && (BLOOD_GROUPS as readonly string[]).includes(v);
}
export function donorGroupsFor(recipient: BG): BG[] {
  return [...DONORS_FOR[recipient]];
}
export function canDonate(donor: BG, recipient: BG): boolean {
  return DONORS_FOR[recipient].includes(donor);
}
export function recipientsFor(donor: BG): BG[] {
  return BLOOD_GROUPS.filter((r) => DONORS_FOR[r].includes(donor));
}
export function bloodLabel(bg: BG): string {
  return bg.replace('_POS', '+').replace('_NEG', '-');
}
