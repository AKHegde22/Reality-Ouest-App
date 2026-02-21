import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerState } from "../types/game";

const PLAYER_STATE_KEY = "@reality-rpg/player-state";

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const normalizePlayerState = (value: unknown): PlayerState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PlayerState>;
  const className =
    candidate.className === "Cleaner" || candidate.className === "Organizer" || candidate.className === "Chef"
      ? candidate.className
      : "Cleaner";

  if (
    !isNumber(candidate.level) ||
    !isNumber(candidate.currentXp) ||
    !isNumber(candidate.gold) ||
    !candidate.attributes
  ) {
    return null;
  }

  const attrs = candidate.attributes as Record<string, unknown>;
  if (!isNumber(attrs.strength) || !isNumber(attrs.intellect) || !isNumber(attrs.charisma) || !isNumber(attrs.willpower)) {
    return null;
  }

  return {
    level: Math.max(1, Math.floor(candidate.level)),
    currentXp: Math.max(0, Math.floor(candidate.currentXp)),
    gold: Math.max(0, Math.floor(candidate.gold)),
    className,
    chapter: isNumber(candidate.chapter) ? Math.max(1, Math.floor(candidate.chapter)) : 1,
    questsCompleted: isNumber(candidate.questsCompleted) ? Math.max(0, Math.floor(candidate.questsCompleted)) : 0,
    attributes: {
      strength: Math.max(0, Math.floor(attrs.strength)),
      intellect: Math.max(0, Math.floor(attrs.intellect)),
      charisma: Math.max(0, Math.floor(attrs.charisma)),
      willpower: Math.max(0, Math.floor(attrs.willpower)),
    },
  };
};

export const loadPlayerState = async (): Promise<PlayerState | null> => {
  try {
    const rawValue = await AsyncStorage.getItem(PLAYER_STATE_KEY);
    if (!rawValue) {
      return null;
    }
    return normalizePlayerState(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const savePlayerState = async (player: PlayerState): Promise<void> => {
  try {
    await AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(player));
  } catch {
    // Ignore persistence errors during MVP mode.
  }
};
