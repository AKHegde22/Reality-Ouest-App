import { PlayerState, Quest } from "../types/game";

export interface RewardSummary {
  player: PlayerState;
  leveledUpBy: number;
}

export const xpNeededForLevel = (level: number): number => 100 + (level - 1) * 60;

export const applyQuestRewards = (player: PlayerState, quest: Quest): RewardSummary => {
  const buffedAttributes = {
    ...player.attributes,
    [quest.attributeReward]: player.attributes[quest.attributeReward] + quest.attributeDelta,
  };

  let level = player.level;
  let xpPool = player.currentXp + quest.xpReward;
  let leveledUpBy = 0;

  while (xpPool >= xpNeededForLevel(level)) {
    xpPool -= xpNeededForLevel(level);
    level += 1;
    leveledUpBy += 1;
  }

  return {
    player: {
      ...player,
      level,
      currentXp: xpPool,
      gold: player.gold + Math.round(quest.xpReward * 0.6),
      attributes: buffedAttributes,
    },
    leveledUpBy,
  };
};
