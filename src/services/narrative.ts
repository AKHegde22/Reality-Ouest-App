import { Quest } from "../types/game";

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickLine = (seed: string, lines: string[]): string => {
  const index = hashString(seed) % lines.length;
  return lines[index] ?? lines[0] ?? "";
};

export const openingLine = (): string =>
  "The hub is ready. Point the Spirit Lens at your next chaos spawn.";

export const questAcceptedLine = (quest: Quest): string =>
  pickLine(`${quest.id}:accept`, [
    `Quest accepted. ${quest.monsterName} marked for elimination.`,
    `${quest.title} is live. Bring back a clean-room proof shot.`,
    `You drew aggro from ${quest.monsterName}. Time to clean.`,
  ]);

export const questCompletedLine = (quest: Quest, goldGain: number): string =>
  pickLine(`${quest.id}:complete`, [
    `Victory. ${quest.monsterName} has fallen. Loot acquired: ${goldGain} gold.`,
    `${quest.title} complete. Corruption faded and your stats climbed.`,
    `Room reclaimed. Reward secured: ${goldGain} gold and fresh momentum.`,
  ]);

export const questFailedLine = (quest: Quest): string =>
  pickLine(`${quest.id}:retry`, [
    `${quest.monsterName} resists. Capture a clearer after photo and strike again.`,
    `The lens needs stronger proof. Re-frame the scene and re-submit.`,
    `Quest progress detected, but verification is uncertain. Try once more.`,
  ]);

export const levelUpLine = (newLevel: number): string =>
  pickLine(`level:${newLevel}`, [
    `Level ${newLevel} reached. Your guild would call this a clean sweep.`,
    `Hero rank up: Level ${newLevel}. Keep the streak alive.`,
    `Level ${newLevel} unlocked. New story chapter potential increased.`,
  ]);

export const classBonusLine = (classBonusMultiplier: number): string => {
  if (classBonusMultiplier <= 1) {
    return "";
  }
  return `Class synergy bonus active: +${Math.round((classBonusMultiplier - 1) * 100)}% XP.`;
};

export const chapterUnlockedLine = (chapter: number): string =>
  pickLine(`chapter:${chapter}`, [
    `Chapter ${chapter} unlocked. Your hub story evolves.`,
    `Story milestone reached: Chapter ${chapter}.`,
    `New narrative chapter available: Chapter ${chapter}.`,
  ]);

export const raidDamageLine = (damage: number, raidBossName: string): string =>
  `${raidBossName} took ${damage} raid damage from your cleanup combo.`;
