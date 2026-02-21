import { QUEST_CATALOG } from "../data/questCatalog";
import { CapturedImage, Quest, QuestTemplate, ScanResult, VerificationResult } from "../types/game";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const inferTags = (uri: string): string[] => {
  const lowered = uri.toLowerCase();
  const knownTags = [
    "laundry",
    "clothes",
    "dish",
    "kitchen",
    "bed",
    "desk",
    "trash",
    "bathroom",
    "mirror",
    "sink",
    "room",
  ];
  return knownTags.filter((tag) => lowered.includes(tag));
};

const toQuest = (template: QuestTemplate, seed: number, index: number): Quest => {
  const xpBonus = seed % 14;
  const attributeDelta = 1 + ((seed + index) % 3);
  const confidence = 0.7 + (((seed + index * 17) % 25) / 100);

  return {
    id: `${template.id}-${seed}-${index}`,
    title: template.label,
    monsterName: template.monsterName,
    estimateMinutes: template.estimateMinutes + ((seed + index) % 6),
    xpReward: template.xpBase + xpBonus,
    discipline: template.discipline,
    attributeReward: template.attributeReward,
    attributeDelta,
    flavor: template.flavor,
    confidence,
  };
};

const buildNarration = (quest: Quest): string =>
  `Spirit Lens lock acquired. ${quest.monsterName} identified. Suggested counter-quest: ${quest.title}.`;

export const analyzeBeforeImage = async (beforeImage: CapturedImage): Promise<ScanResult> => {
  await wait(950);

  const seed = hashString(beforeImage.uri);
  const tags = inferTags(beforeImage.uri);
  const matched = QUEST_CATALOG.filter((template) =>
    template.tags.some((tag) => tags.includes(tag)),
  );
  const fallback = [...QUEST_CATALOG].sort(
    (a, b) =>
      (hashString(`${a.id}:${seed}`) % QUEST_CATALOG.length) -
      (hashString(`${b.id}:${seed}`) % QUEST_CATALOG.length),
  );
  const selectedTemplates = [...matched, ...fallback].filter(
    (template, index, array) => array.findIndex((item) => item.id === template.id) === index,
  );

  const quests = selectedTemplates.slice(0, 3).map((template, index) => toQuest(template, seed, index));
  const primaryQuest = quests[0];

  return {
    narration: primaryQuest ? buildNarration(primaryQuest) : "No hostile mess signatures found.",
    quests,
    source: "mock",
  };
};

export const verifyAfterImage = async ({
  beforeImage,
  afterImage,
  quest,
}: {
  beforeImage: CapturedImage;
  afterImage: CapturedImage;
  quest: Quest;
}): Promise<VerificationResult> => {
  await wait(1000);

  if (beforeImage.base64 === afterImage.base64) {
    return {
      success: false,
      confidence: 0.16,
      message: "Verification failed: after photo matches the before photo.",
      source: "mock",
    };
  }

  const score = hashString(`${beforeImage.uri}|${afterImage.uri}|${quest.id}`) % 100;
  const success = score >= 24;

  return {
    success,
    confidence: success ? 0.72 + ((score % 21) / 100) : 0.34 + ((score % 23) / 100),
    message: success
      ? `${quest.monsterName} dispelled. Room corruption reduced.`
      : "The room signature changed only slightly. Try a clearer after photo.",
    source: "mock",
  };
};
