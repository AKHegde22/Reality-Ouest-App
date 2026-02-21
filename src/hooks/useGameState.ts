import { useEffect, useMemo, useState } from "react";
import { analyzeBeforeImage, verifyAfterImage } from "../services/visionApi";
import { applyQuestRewards, chapterForLevel, xpNeededForLevel } from "../services/progression";
import { loadPlayerState, savePlayerState } from "../services/persistence";
import {
  applyRaidDamage,
  createDefaultGuildState,
  loadGuildState,
  renameGuild,
  saveGuildState,
  startRaid,
  totalHeroRaidDamage,
} from "../services/guild";
import {
  chapterUnlockedLine,
  classBonusLine,
  levelUpLine,
  openingLine,
  questAcceptedLine,
  questCompletedLine,
  questFailedLine,
  raidDamageLine,
} from "../services/narrative";
import {
  ActiveQuest,
  CapturedImage,
  GuildState,
  HeroClass,
  PlayerState,
  Quest,
  ScanResult,
  VerificationResult,
  VisionProvider,
} from "../types/game";

const defaultPlayerState: PlayerState = {
  level: 1,
  currentXp: 0,
  gold: 0,
  className: "Cleaner",
  chapter: 1,
  questsCompleted: 0,
  attributes: {
    strength: 1,
    intellect: 1,
    charisma: 1,
    willpower: 1,
  },
};

interface UseGameState {
  ready: boolean;
  player: PlayerState;
  guild: GuildState;
  guildDamageTotal: number;
  xpToNextLevel: number;
  dialogue: string;
  visionMode: VisionProvider | null;
  busyLabel: string | null;
  beforeImage: CapturedImage | null;
  afterImage: CapturedImage | null;
  scanResult: ScanResult | null;
  activeQuest: ActiveQuest | null;
  verificationResult: VerificationResult | null;
  setHeroClass: (className: HeroClass) => void;
  startGuildRaid: () => void;
  renameGuildName: (guildName: string) => void;
  setBeforeImage: (image: CapturedImage) => void;
  setAfterImage: (image: CapturedImage) => void;
  analyzeScene: () => Promise<void>;
  acceptQuest: (quest: Quest) => void;
  submitQuest: () => Promise<void>;
  resetRun: () => void;
}

export const useGameState = (): UseGameState => {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<PlayerState>(defaultPlayerState);
  const [guild, setGuild] = useState<GuildState>(createDefaultGuildState("Hero"));
  const [dialogue, setDialogue] = useState<string>(openingLine());
  const [visionMode, setVisionMode] = useState<VisionProvider | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [beforeImage, setBeforeImageState] = useState<CapturedImage | null>(null);
  const [afterImage, setAfterImageState] = useState<CapturedImage | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([loadPlayerState(), loadGuildState()])
      .then(([loadedPlayer, loadedGuild]) => {
        if (!mounted) {
          return;
        }

        if (loadedPlayer) {
          setPlayer({
            ...loadedPlayer,
            chapter: loadedPlayer.chapter || chapterForLevel(loadedPlayer.level),
            questsCompleted: loadedPlayer.questsCompleted || 0,
          });
        }

        if (loadedGuild) {
          setGuild(loadedGuild);
        }
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void savePlayerState(player);
  }, [player, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void saveGuildState(guild);
  }, [guild, ready]);

  const xpToNextLevel = useMemo(
    () => Math.max(xpNeededForLevel(player.level) - player.currentXp, 0),
    [player.currentXp, player.level],
  );

  const guildDamageTotal = useMemo(() => totalHeroRaidDamage(guild), [guild]);

  const setHeroClass = (className: HeroClass): void => {
    setPlayer((prev) => ({ ...prev, className }));
    setDialogue(`Class changed to ${className}. Matching quests now grant bonus XP.`);
  };

  const startGuildRaid = (): void => {
    setGuild((prev) => {
      const next = startRaid(prev);
      return next;
    });
    setDialogue("Guild raid started. Complete quests to deal boss damage.");
  };

  const renameGuildName = (guildName: string): void => {
    setGuild((prev) => renameGuild(prev, guildName));
  };

  const setBeforeImage = (image: CapturedImage): void => {
    setBeforeImageState(image);
    setAfterImageState(null);
    setScanResult(null);
    setActiveQuest(null);
    setVerificationResult(null);
    setDialogue("Spirit Lens image captured. Run a scan to generate quests.");
  };

  const setAfterImage = (image: CapturedImage): void => {
    setAfterImageState(image);
    setVerificationResult(null);
  };

  const analyzeScene = async (): Promise<void> => {
    if (!beforeImage) {
      return;
    }

    try {
      setBusyLabel("Scanning room...");
      const result = await analyzeBeforeImage(beforeImage);
      setScanResult(result);
      setVisionMode(result.source);
      setDialogue(
        result.source === "cerebras"
          ? result.narration
          : `${result.narration} Cloud vision unavailable, running local fallback.`,
      );
    } finally {
      setBusyLabel(null);
    }
  };

  const acceptQuest = (quest: Quest): void => {
    if (!beforeImage) {
      return;
    }

    setActiveQuest({
      ...quest,
      beforeImage,
      startedAt: Date.now(),
    });
    setVerificationResult(null);
    setDialogue(questAcceptedLine(quest));
  };

  const submitQuest = async (): Promise<void> => {
    if (!activeQuest || !afterImage) {
      return;
    }

    try {
      setBusyLabel("Verifying cleanup...");
      const result = await verifyAfterImage({
        beforeImage: activeQuest.beforeImage,
        afterImage,
        quest: activeQuest,
      });

      setVerificationResult(result);
      setVisionMode(result.source);
      if (!result.success) {
        setDialogue(questFailedLine(activeQuest));
        return;
      }

      const rewardSummary = applyQuestRewards(player, activeQuest);
      const goldGain = rewardSummary.player.gold - player.gold;
      setPlayer(rewardSummary.player);

      const previousRaid = guild.activeRaid;
      if (previousRaid) {
        setGuild((prev) => applyRaidDamage(prev, rewardSummary.raidDamage));
      }

      const completionParts = [
        questCompletedLine(activeQuest, goldGain),
        classBonusLine(rewardSummary.classBonusMultiplier),
        rewardSummary.leveledUpBy > 0 ? levelUpLine(rewardSummary.player.level) : "",
        rewardSummary.chapterUnlocked ? chapterUnlockedLine(rewardSummary.player.chapter) : "",
        previousRaid ? raidDamageLine(rewardSummary.raidDamage, previousRaid.bossName) : "",
      ].filter(Boolean);

      const completionNarration = completionParts.join(" ");

      setDialogue(
        result.source === "cerebras"
          ? completionNarration
          : `${completionNarration} Verification used local fallback mode.`,
      );

      setBeforeImageState(null);
      setAfterImageState(null);
      setScanResult(null);
      setActiveQuest(null);
    } finally {
      setBusyLabel(null);
    }
  };

  const resetRun = (): void => {
    setBeforeImageState(null);
    setAfterImageState(null);
    setScanResult(null);
    setActiveQuest(null);
    setVerificationResult(null);
    setDialogue(openingLine());
  };

  return {
    ready,
    player,
    guild,
    guildDamageTotal,
    xpToNextLevel,
    dialogue,
    visionMode,
    busyLabel,
    beforeImage,
    afterImage,
    scanResult,
    activeQuest,
    verificationResult,
    setHeroClass,
    startGuildRaid,
    renameGuildName,
    setBeforeImage,
    setAfterImage,
    analyzeScene,
    acceptQuest,
    submitQuest,
    resetRun,
  };
};
