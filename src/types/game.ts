export type AttributeKey = "strength" | "intellect" | "charisma" | "willpower";

export type HeroClass = "Cleaner" | "Organizer" | "Chef";

export type Attributes = Record<AttributeKey, number>;

export interface PlayerState {
  level: number;
  currentXp: number;
  gold: number;
  className: HeroClass;
  attributes: Attributes;
}

export interface QuestTemplate {
  id: string;
  label: string;
  monsterName: string;
  estimateMinutes: number;
  xpBase: number;
  attributeReward: AttributeKey;
  flavor: string;
  tags: string[];
}

export interface Quest {
  id: string;
  title: string;
  monsterName: string;
  estimateMinutes: number;
  xpReward: number;
  attributeReward: AttributeKey;
  attributeDelta: number;
  flavor: string;
  confidence: number;
}

export interface ActiveQuest extends Quest {
  beforeImageUri: string;
  startedAt: number;
}

export interface ScanResult {
  narration: string;
  quests: Quest[];
}

export interface VerificationResult {
  success: boolean;
  confidence: number;
  message: string;
}
