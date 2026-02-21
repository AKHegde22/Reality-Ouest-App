import { HeroClass, PlayerState, Quest, QuestDiscipline } from "../types/game";

export interface RewardSummary {
  player: PlayerState;
  leveledUpBy: number;
  chapterUnlocked: boolean;
  finalXpReward: number;
  classBonusMultiplier: number;
  raidDamage: number;
}

export const xpNeededForLevel = (level: number): number => 100 + (level - 1) * 60;
export const chapterForLevel = (level: number): number => 1 + Math.floor((Math.max(level, 1) - 1) / 3);

const classBonusMultiplierForQuest = (className: HeroClass, discipline: QuestDiscipline): number => {
  if (className === "Cleaner" && discipline === "tidy") {
    return 1.25;
  }
  if (className === "Organizer" && discipline === "organize") {
    return 1.25;
  }
  if (className === "Chef" && discipline === "kitchen") {
    return 1.25;
  }
  return 1;
};

export const applyQuestRewards = (player: PlayerState, quest: Quest): RewardSummary => {
  const classBonusMultiplier = classBonusMultiplierForQuest(player.className, quest.discipline);
  const finalXpReward = Math.max(Math.round(quest.xpReward * classBonusMultiplier), 1);

  const buffedAttributes = {
    ...player.attributes,
    [quest.attributeReward]: player.attributes[quest.attributeReward] + quest.attributeDelta,
  };

  let level = player.level;
  let xpPool = player.currentXp + finalXpReward;
  let leveledUpBy = 0;

  while (xpPool >= xpNeededForLevel(level)) {
    xpPool -= xpNeededForLevel(level);
    level += 1;
    leveledUpBy += 1;
  }

  const newChapter = chapterForLevel(level);
  const chapterUnlocked = newChapter > player.chapter;
  const raidDamage = Math.max(Math.round(finalXpReward * 1.15), 1);

  return {
    player: {
      ...player,
      level,
      currentXp: xpPool,
      chapter: newChapter,
      questsCompleted: player.questsCompleted + 1,
      gold: player.gold + Math.round(finalXpReward * 0.6),
      attributes: buffedAttributes,
    },
    leveledUpBy,
    chapterUnlocked,
    finalXpReward,
    classBonusMultiplier,
    raidDamage,
  };
};
