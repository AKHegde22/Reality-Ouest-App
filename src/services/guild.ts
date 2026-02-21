import AsyncStorage from "@react-native-async-storage/async-storage";
import { GuildRaid, GuildState } from "../types/game";

const GUILD_STATE_KEY = "@reality-rpg/guild-state";

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
    heroName,
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
    const parsed = JSON.parse(rawValue) as Partial<GuildState>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.guildId !== "string" ||
      typeof parsed.guildName !== "string" ||
      typeof parsed.heroId !== "string" ||
      typeof parsed.heroName !== "string"
    ) {
      return null;
    }
    return {
      guildId: parsed.guildId,
      guildName: parsed.guildName,
      heroId: parsed.heroId,
      heroName: parsed.heroName,
      activeRaid: parsed.activeRaid ?? null,
      raidHistory: Array.isArray(parsed.raidHistory) ? parsed.raidHistory : [],
    };
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
  guildName: guildName.trim() || guild.guildName,
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
    ],
  };

  return {
    ...guild,
    activeRaid: completed ? null : updatedRaid,
    raidHistory: completed ? [updatedRaid, ...guild.raidHistory].slice(0, 15) : guild.raidHistory,
  };
};

export const totalHeroRaidDamage = (guild: GuildState): number =>
  [
    ...(guild.activeRaid ? guild.activeRaid.contributions : []),
    ...guild.raidHistory.flatMap((raid) => raid.contributions),
  ]
    .filter((contribution) => contribution.memberId === guild.heroId)
    .reduce((sum, contribution) => sum + contribution.damage, 0);
