import { analyzeBeforeImage as analyzeBeforeImageMock, verifyAfterImage as verifyAfterImageMock } from "./visionMock";
import { CapturedImage, Quest, ScanResult, VerificationResult } from "../types/game";

const sanitizeBaseUrl = (value: string | undefined): string | null => {
  if (!value?.trim()) {
    return null;
  }
  return value.replace(/\/$/, "");
};

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const sanitizeText = (value: unknown, fallback: string, maxLength = 220): string =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;

const API_BASE_URL = sanitizeBaseUrl(process.env.EXPO_PUBLIC_REALITY_API_BASE_URL);
const API_TIMEOUT_MS = toPositiveInt(process.env.EXPO_PUBLIC_REALITY_API_TIMEOUT_MS, 12000);

const withTimeout = async (input: RequestInfo, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const sanitizeQuest = (candidate: unknown, index: number): Quest | null => {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const quest = candidate as Partial<Quest>;
  const discipline =
    quest.discipline === "tidy" || quest.discipline === "organize" || quest.discipline === "kitchen"
      ? quest.discipline
      : null;
  const attributeReward =
    quest.attributeReward === "strength" ||
    quest.attributeReward === "intellect" ||
    quest.attributeReward === "charisma" ||
    quest.attributeReward === "willpower"
      ? quest.attributeReward
      : null;

  if (!discipline || !attributeReward) {
    return null;
  }

  return {
    id: sanitizeText(quest.id, `quest-${Date.now()}-${index}`, 40),
    title: sanitizeText(quest.title, "Unclassified Cleanup", 80),
    monsterName: sanitizeText(quest.monsterName, "Chaos Entity", 60),
    estimateMinutes: clamp(Number(quest.estimateMinutes || 10), 3, 90),
    xpReward: clamp(Number(quest.xpReward || 20), 10, 200),
    discipline,
    attributeReward,
    attributeDelta: clamp(Number(quest.attributeDelta || 1), 1, 3),
    flavor: sanitizeText(quest.flavor, "Restore order and reclaim your room.", 180),
    confidence: clamp(Number(quest.confidence || 0.55), 0, 1),
  };
};

const sanitizeScanResult = (candidate: unknown): ScanResult | null => {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const payload = candidate as Partial<ScanResult>;
  const source = payload.source === "cerebras" || payload.source === "mock" ? payload.source : null;
  if (!source || !Array.isArray(payload.quests)) {
    return null;
  }

  const quests = payload.quests.map(sanitizeQuest).filter((quest): quest is Quest => Boolean(quest));
  if (quests.length === 0) {
    return null;
  }

  return {
    narration: sanitizeText(payload.narration, "Spirit Lens scan complete.", 220),
    quests: quests.slice(0, 3),
    source,
  };
};

const sanitizeVerificationResult = (candidate: unknown): VerificationResult | null => {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const payload = candidate as Partial<VerificationResult>;
  const source = payload.source === "cerebras" || payload.source === "mock" ? payload.source : null;
  if (!source || typeof payload.success !== "boolean") {
    return null;
  }

  return {
    success: payload.success,
    confidence: clamp(Number(payload.confidence || 0), 0, 1),
    message: sanitizeText(
      payload.message,
      payload.success ? "Quest completed." : "Verification failed. Try a clearer photo.",
      140,
    ),
    source,
  };
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("Reality API base URL is not configured.");
  }

  const response = await withTimeout(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Reality API error (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as T;
};

const logFallback = (message: string, error: unknown): void => {
  const isDevRuntime =
    typeof globalThis === "object" &&
    globalThis !== null &&
    Boolean((globalThis as { __DEV__?: boolean }).__DEV__);

  if (isDevRuntime) {
    const details = error instanceof Error ? error.message : String(error);
    console.warn(`[visionApi] ${message}: ${details}`);
  }
};

export const analyzeBeforeImage = async (beforeImage: CapturedImage): Promise<ScanResult> => {
  if (!API_BASE_URL) {
    return analyzeBeforeImageMock(beforeImage);
  }

  try {
    const result = await postJson<unknown>("/api/v1/scan", {
      beforeImageBase64: beforeImage.base64,
      mimeType: beforeImage.mimeType,
    });

    const sanitized = sanitizeScanResult(result);
    if (!sanitized) {
      throw new Error("Invalid scan payload from Reality API.");
    }

    return sanitized;
  } catch (error) {
    logFallback("falling back to mock scan", error);
    return analyzeBeforeImageMock(beforeImage);
  }
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
  if (!API_BASE_URL) {
    return verifyAfterImageMock({
      beforeImage,
      afterImage,
      quest,
    });
  }

  try {
    const result = await postJson<unknown>("/api/v1/verify", {
      beforeImageBase64: beforeImage.base64,
      beforeMimeType: beforeImage.mimeType,
      afterImageBase64: afterImage.base64,
      afterMimeType: afterImage.mimeType,
      quest,
    });

    const sanitized = sanitizeVerificationResult(result);
    if (!sanitized) {
      throw new Error("Invalid verification payload from Reality API.");
    }

    return sanitized;
  } catch (error) {
    logFallback("falling back to mock verification", error);
    return verifyAfterImageMock({
      beforeImage,
      afterImage,
      quest,
    });
  }
};
