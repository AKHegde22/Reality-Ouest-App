import { analyzeBeforeImage as analyzeBeforeImageMock, verifyAfterImage as verifyAfterImageMock } from "./visionMock";
import { CapturedImage, Quest, ScanResult, VerificationResult } from "../types/game";

const API_BASE_URL = process.env.EXPO_PUBLIC_REALITY_API_BASE_URL?.replace(/\/$/, "");
const API_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_REALITY_API_TIMEOUT_MS ?? 12000);

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

const isQuestShape = (value: unknown): value is Quest => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const quest = value as Quest;
  return (
    typeof quest.id === "string" &&
    typeof quest.title === "string" &&
    typeof quest.monsterName === "string" &&
    typeof quest.estimateMinutes === "number" &&
    typeof quest.xpReward === "number" &&
    (quest.discipline === "tidy" || quest.discipline === "organize" || quest.discipline === "kitchen") &&
    typeof quest.attributeReward === "string" &&
    typeof quest.attributeDelta === "number" &&
    typeof quest.flavor === "string" &&
    typeof quest.confidence === "number"
  );
};

const isScanResultShape = (value: unknown): value is ScanResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as ScanResult;
  return (
    typeof payload.narration === "string" &&
    Array.isArray(payload.quests) &&
    payload.quests.every(isQuestShape) &&
    (payload.source === "cerebras" || payload.source === "mock")
  );
};

const isVerificationResultShape = (value: unknown): value is VerificationResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as VerificationResult;
  return (
    typeof payload.success === "boolean" &&
    typeof payload.confidence === "number" &&
    typeof payload.message === "string" &&
    (payload.source === "cerebras" || payload.source === "mock")
  );
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("Reality API base URL is not configured.");
  }

  const response = await withTimeout(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Reality API error (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as T;
};

export const analyzeBeforeImage = async (beforeImage: CapturedImage): Promise<ScanResult> => {
  if (!API_BASE_URL) {
    return analyzeBeforeImageMock(beforeImage);
  }

  try {
    const result = await postJson<ScanResult>("/api/v1/scan", {
      beforeImageBase64: beforeImage.base64,
      mimeType: beforeImage.mimeType,
    });

    if (!isScanResultShape(result)) {
      throw new Error("Invalid scan payload from Reality API.");
    }

    return result;
  } catch {
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
    const result = await postJson<VerificationResult>("/api/v1/verify", {
      beforeImageBase64: beforeImage.base64,
      beforeMimeType: beforeImage.mimeType,
      afterImageBase64: afterImage.base64,
      afterMimeType: afterImage.mimeType,
      quest,
    });

    if (!isVerificationResultShape(result)) {
      throw new Error("Invalid verification payload from Reality API.");
    }

    return result;
  } catch {
    return verifyAfterImageMock({
      beforeImage,
      afterImage,
      quest,
    });
  }
};
