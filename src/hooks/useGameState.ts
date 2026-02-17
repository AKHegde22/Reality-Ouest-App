import { useEffect, useMemo, useState } from "react";
import { analyzeBeforeImage, verifyAfterImage } from "../services/visionMock";
import { applyQuestRewards, xpNeededForLevel } from "../services/progression";
import { loadPlayerState, savePlayerState } from "../services/persistence";
import {
  levelUpLine,
  openingLine,
  questAcceptedLine,
  questCompletedLine,
  questFailedLine,
} from "../services/narrative";
import { ActiveQuest, PlayerState, Quest, ScanResult, VerificationResult } from "../types/game";

const defaultPlayerState: PlayerState = {
  level: 1,
  currentXp: 0,
  gold: 0,
  className: "Cleaner",
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
  xpToNextLevel: number;
  dialogue: string;
  busyLabel: string | null;
  beforeImageUri: string | null;
  afterImageUri: string | null;
  scanResult: ScanResult | null;
  activeQuest: ActiveQuest | null;
  verificationResult: VerificationResult | null;
  setBeforeImage: (uri: string) => void;
  setAfterImage: (uri: string) => void;
  analyzeScene: () => Promise<void>;
  acceptQuest: (quest: Quest) => void;
  submitQuest: () => Promise<void>;
  resetRun: () => void;
}

export const useGameState = (): UseGameState => {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<PlayerState>(defaultPlayerState);
  const [dialogue, setDialogue] = useState<string>(openingLine());
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [beforeImageUri, setBeforeImageUri] = useState<string | null>(null);
  const [afterImageUri, setAfterImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let mounted = true;

    loadPlayerState()
      .then((loadedPlayer) => {
        if (!mounted || !loadedPlayer) {
          return;
        }
        setPlayer(loadedPlayer);
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

  const xpToNextLevel = useMemo(
    () => Math.max(xpNeededForLevel(player.level) - player.currentXp, 0),
    [player.currentXp, player.level],
  );

  const setBeforeImage = (uri: string): void => {
    setBeforeImageUri(uri);
    setAfterImageUri(null);
    setScanResult(null);
    setActiveQuest(null);
    setVerificationResult(null);
    setDialogue("Spirit Lens image captured. Run a scan to generate quests.");
  };

  const setAfterImage = (uri: string): void => {
    setAfterImageUri(uri);
    setVerificationResult(null);
  };

  const analyzeScene = async (): Promise<void> => {
    if (!beforeImageUri) {
      return;
    }

    try {
      setBusyLabel("Scanning room...");
      const result = await analyzeBeforeImage(beforeImageUri);
      setScanResult(result);
      setDialogue(result.narration);
    } finally {
      setBusyLabel(null);
    }
  };

  const acceptQuest = (quest: Quest): void => {
    if (!beforeImageUri) {
      return;
    }

    setActiveQuest({
      ...quest,
      beforeImageUri,
      startedAt: Date.now(),
    });
    setVerificationResult(null);
    setDialogue(questAcceptedLine(quest));
  };

  const submitQuest = async (): Promise<void> => {
    if (!activeQuest || !afterImageUri) {
      return;
    }

    try {
      setBusyLabel("Verifying cleanup...");
      const result = await verifyAfterImage({
        beforeImageUri: activeQuest.beforeImageUri,
        afterImageUri,
        quest: activeQuest,
      });

      setVerificationResult(result);
      if (!result.success) {
        setDialogue(questFailedLine(activeQuest));
        return;
      }

      const rewardSummary = applyQuestRewards(player, activeQuest);
      const goldGain = rewardSummary.player.gold - player.gold;
      setPlayer(rewardSummary.player);

      const completionNarration = [
        questCompletedLine(activeQuest, goldGain),
        rewardSummary.leveledUpBy > 0 ? levelUpLine(rewardSummary.player.level) : "",
      ]
        .filter(Boolean)
        .join(" ");

      setDialogue(completionNarration);

      setBeforeImageUri(null);
      setAfterImageUri(null);
      setScanResult(null);
      setActiveQuest(null);
    } finally {
      setBusyLabel(null);
    }
  };

  const resetRun = (): void => {
    setBeforeImageUri(null);
    setAfterImageUri(null);
    setScanResult(null);
    setActiveQuest(null);
    setVerificationResult(null);
    setDialogue(openingLine());
  };

  return {
    ready,
    player,
    xpToNextLevel,
    dialogue,
    busyLabel,
    beforeImageUri,
    afterImageUri,
    scanResult,
    activeQuest,
    verificationResult,
    setBeforeImage,
    setAfterImage,
    analyzeScene,
    acceptQuest,
    submitQuest,
    resetRun,
  };
};
