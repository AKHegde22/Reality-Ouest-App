import AsyncStorage from "@react-native-async-storage/async-storage";
import { GuildRaid, GuildState, RaidContribution, RaidStatus } from "../types/game";

const GUILD_STATE_KEY = "@reality-rpg/guild-state";
const MAX_RAID_HISTORY = 15;
const MAX_CONTRIBUTIONS_PER_RAID = 250;

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const sanitizeText = (value: unknown, fallback: string, maxLength = 64): string =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;

const clampInt = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(parsed), min), max);
};

const sanitizeContribution = (value: unknown): RaidContribution | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const contribution = value as Partial<RaidContribution>;
  return {
    memberId: sanitizeText(contribution.memberId, "unknown-member", 40),
    memberName: sanitizeText(contribution.memberName, "Unknown", 40),
    damage: clampInt(contribution.damage, 0, 0, 2000),
    at: clampInt(contribution.at, Date.now(), 0),
  };
};

const sanitizeRaidStatus = (value: unknown): RaidStatus => (value === "completed" ? "completed" : "active");

const sanitizeRaid = (value: unknown): GuildRaid | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raid = value as Partial<GuildRaid>;
  const maxHp = clampInt(raid.maxHp, 400, 1, 5000);
  const currentHp = clampInt(raid.currentHp, maxHp, 0, maxHp);
  const status = sanitizeRaidStatus(raid.status);
  const contributions = Array.isArray(raid.contributions)
    ? raid.contributions
        .map(sanitizeContribution)
        .filter((entry): entry is RaidContribution => Boolean(entry))
        .slice(0, MAX_CONTRIBUTIONS_PER_RAID)
    : [];

  return {
    id: sanitizeText(raid.id, `raid-${Date.now()}`, 60),
    title: sanitizeText(raid.title, "Untitled Raid", 80),
    bossName: sanitizeText(raid.bossName, "Chaos Overlord", 60),
    maxHp,
    currentHp,
    status: currentHp === 0 ? "completed" : status,
    contributions,
    createdAt: clampInt(raid.createdAt, Date.now(), 0),
    completedAt: raid.completedAt ? clampInt(raid.completedAt, Date.now(), 0) : undefined,
  };
};

const normalizeGuildState = (value: unknown): GuildState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const guild = value as Partial<GuildState>;
  if (!guild.guildId || !guild.heroId) {
    return null;
  }

  const activeRaid = sanitizeRaid(guild.activeRaid);
  let raidHistory = Array.isArray(guild.raidHistory)
    ? guild.raidHistory
        .map(sanitizeRaid)
        .filter((raid): raid is GuildRaid => Boolean(raid))
        .slice(0, MAX_RAID_HISTORY)
    : [];

  let normalizedActiveRaid: GuildRaid | null = null;
  if (activeRaid) {
    if (activeRaid.status === "active" && activeRaid.currentHp > 0) {
      normalizedActiveRaid = activeRaid;
    } else {
      raidHistory = [activeRaid, ...raidHistory].slice(0, MAX_RAID_HISTORY);
    }
  }

  return {
    guildId: sanitizeText(guild.guildId, `guild-${Date.now()}`, 60),
    guildName: sanitizeText(guild.guildName, "Starter Guild", 50),
    heroId: sanitizeText(guild.heroId, "hero-1", 40),
    heroName: sanitizeText(guild.heroName, "Hero", 40),
    activeRaid: normalizedActiveRaid,
    raidHistory,
  };
};

const RAID_BOSSES = [
  "Post-Party Poltergeist",
  "Dishpile Titan",
  "Closet Chimera",
  "Dust Monarch",
  "Sofa Kraken",
  "Paper Dragon",
];

export const createDefaultGuildState = (heroName = "Hero"): GuildState => {
  const seed = Date.now();
  return {
    guildId: `guild-${seed}`,
    guildName: "Starter Guild",
    heroId: "hero-1",
    heroName: sanitizeText(heroName, "Hero", 40),
    activeRaid: null,
    raidHistory: [],
  };
};

export const loadGuildState = async (): Promise<GuildState | null> => {
  try {
    const rawValue = await AsyncStorage.getItem(GUILD_STATE_KEY);
    if (!rawValue) {
      return null;
    }
    return normalizeGuildState(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const saveGuildState = async (guild: GuildState): Promise<void> => {
  try {
    await AsyncStorage.setItem(GUILD_STATE_KEY, JSON.stringify(guild));
  } catch {
    // Ignore persistence errors in local mode.
  }
};

export const renameGuild = (guild: GuildState, guildName: string): GuildState => ({
  ...guild,
  guildName: sanitizeText(guildName, guild.guildName, 50),
});

export const startRaid = (guild: GuildState): GuildState => {
  if (guild.activeRaid && guild.activeRaid.status === "active") {
    return guild;
  }

  const seed = hashString(`${guild.guildId}:${guild.raidHistory.length}:${Date.now()}`);
  const bossName = RAID_BOSSES[seed % RAID_BOSSES.length] ?? "Chaos Overlord";
  const maxHp = 350 + (seed % 300);
  const raid: GuildRaid = {
    id: `raid-${Date.now()}`,
    title: `${bossName} Extermination`,
    bossName,
    maxHp,
    currentHp: maxHp,
    status: "active",
    contributions: [],
    createdAt: Date.now(),
  };

  return {
    ...guild,
    activeRaid: raid,
  };
};

export const applyRaidDamage = (guild: GuildState, damage: number): GuildState => {
  if (!guild.activeRaid || guild.activeRaid.status !== "active") {
    return guild;
  }

  const actualDamage = Math.max(Math.round(damage), 1);
  const nextHp = Math.max(guild.activeRaid.currentHp - actualDamage, 0);
  const completed = nextHp === 0;
  const updatedRaid: GuildRaid = {
    ...guild.activeRaid,
    currentHp: nextHp,
    status: completed ? "completed" : "active",
    completedAt: completed ? Date.now() : guild.activeRaid.completedAt,
    contributions: [
      ...guild.activeRaid.contributions,
      {
        memberId: guild.heroId,
        memberName: guild.heroName,
        damage: actualDamage,
        at: Date.now(),
      },
    ].slice(-MAX_CONTRIBUTIONS_PER_RAID),
  };

  return {
    ...guild,
    activeRaid: completed ? null : updatedRaid,
    raidHistory: completed ? [updatedRaid, ...guild.raidHistory].slice(0, MAX_RAID_HISTORY) : guild.raidHistory,
  };
};

export const totalHeroRaidDamage = (guild: GuildState): number =>
  [
    ...(guild.activeRaid ? guild.activeRaid.contributions : []),
    ...guild.raidHistory.flatMap((raid) => raid.contributions),
  ]
    .filter((contribution) => contribution.memberId === guild.heroId)
    .reduce((sum, contribution) => sum + contribution.damage, 0);
