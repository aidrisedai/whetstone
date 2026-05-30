import type { BuilderProfile } from "./types";

const KEY = "whetstone-builder-profile";
const XP_PER_PART = 25;
const XP_PER_LEVEL = 100;
/** Bonus XP for each correct checkpoint answer. */
export const XP_PER_CORRECT = 10;

export function defaultProfile(): BuilderProfile {
  return {
    name: "",
    favoriteGame: "",
    xp: 0,
    conceptsLearned: [],
    partsBuilt: 0,
    projectsBuilt: 0,
    quizzesAced: 0,
    createdAt: Date.now(),
  };
}

export function loadProfile(): BuilderProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultProfile(), ...(JSON.parse(raw) as Partial<BuilderProfile>) };
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

export function saveProfile(p: BuilderProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export const xpPerPart = XP_PER_PART;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** Progress through the current level, 0..1. */
export function levelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function addConcept(list: string[], concept: string): string[] {
  const c = concept.trim();
  if (!c) return list;
  return list.includes(c) ? list : [...list, c];
}
