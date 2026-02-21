export type AttributeKey = "strength" | "intellect" | "charisma" | "willpower";

export type HeroClass = "Cleaner" | "Organizer" | "Chef";
export type VisionProvider = "cerebras" | "mock";
export type QuestDiscipline = "tidy" | "organize" | "kitchen";

export type Attributes = Record<AttributeKey, number>;

export interface CapturedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

export interface PlayerState {
  level: number;
  currentXp: number;
  gold: number;
  className: HeroClass;
  chapter: number;
  questsCompleted: number;
  attributes: Attributes;
}

export interface QuestTemplate {
  id: string;
  label: string;
  monsterName: string;
  estimateMinutes: number;
  xpBase: number;
  discipline: QuestDiscipline;
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
  discipline: QuestDiscipline;
  attributeReward: AttributeKey;
  attributeDelta: number;
  flavor: string;
  confidence: number;
}

export interface ActiveQuest extends Quest {
  beforeImage: CapturedImage;
  startedAt: number;
}

export interface ScanResult {
  narration: string;
  quests: Quest[];
  source: VisionProvider;
}

export interface VerificationResult {
  success: boolean;
  confidence: number;
  message: string;
  source: VisionProvider;
}

export interface RaidContribution {
  memberId: string;
  memberName: string;
  damage: number;
  at: number;
}

export type RaidStatus = "active" | "completed";

export interface GuildRaid {
  id: string;
  title: string;
  bossName: string;
  maxHp: number;
  currentHp: number;
  status: RaidStatus;
  contributions: RaidContribution[];
  createdAt: number;
  completedAt?: number;
}

export interface GuildState {
  guildId: string;
  guildName: string;
  heroId: string;
  heroName: string;
  activeRaid: GuildRaid | null;
  raidHistory: GuildRaid[];
}
