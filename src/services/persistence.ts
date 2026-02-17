import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerState } from "../types/game";

const PLAYER_STATE_KEY = "@reality-rpg/player-state";

export const loadPlayerState = async (): Promise<PlayerState | null> => {
  try {
    const rawValue = await AsyncStorage.getItem(PLAYER_STATE_KEY);
    if (!rawValue) {
      return null;
    }
    return JSON.parse(rawValue) as PlayerState;
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
