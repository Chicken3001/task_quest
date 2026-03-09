export type Difficulty = "easy" | "medium" | "hard" | "epic";

export const XP_REWARDS: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
  epic: 100,
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  hard: "bg-orange-100 text-orange-700 border-orange-300",
  epic: "bg-red-100 text-red-700 border-red-300",
};

export function getLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function getXpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

export function getLevelProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  const level = getLevel(xp);
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return { level, currentLevelXp, nextLevelXp, progress };
}
