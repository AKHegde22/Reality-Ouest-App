import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const loadDotEnv = () => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value =
      (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadDotEnv();

const PORT = Number(process.env.PORT ?? 8787);
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY ?? "";
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL ?? "gpt-oss-120b";
const CEREBRAS_API_BASE_URL = (process.env.CEREBRAS_API_BASE_URL ?? "https://api.cerebras.ai/v1").replace(
  /\/$/,
  "",
);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const REQUEST_TIMEOUT_MS = Number(process.env.CEREBRAS_REQUEST_TIMEOUT_MS ?? 18000);
const MAX_BODY_SIZE_BYTES = 12 * 1024 * 1024;

const QUEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "monsterName",
    "estimateMinutes",
    "xpReward",
    "discipline",
    "attributeReward",
    "attributeDelta",
    "flavor",
    "confidence",
  ],
  properties: {
    id: { type: "string", minLength: 2, maxLength: 40 },
    title: { type: "string", minLength: 3, maxLength: 80 },
    monsterName: { type: "string", minLength: 3, maxLength: 60 },
    estimateMinutes: { type: "number", minimum: 3, maximum: 90 },
    xpReward: { type: "number", minimum: 10, maximum: 200 },
    discipline: {
      type: "string",
      enum: ["tidy", "organize", "kitchen"],
    },
    attributeReward: {
      type: "string",
      enum: ["strength", "intellect", "charisma", "willpower"],
    },
    attributeDelta: { type: "number", minimum: 1, maximum: 3 },
    flavor: { type: "string", minLength: 6, maxLength: 180 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

const SCAN_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["narration", "quests"],
  properties: {
    narration: { type: "string", minLength: 5, maxLength: 220 },
    quests: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: QUEST_SCHEMA,
    },
  },
};

const VERIFY_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["success", "confidence", "message"],
  properties: {
    success: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    message: { type: "string", minLength: 5, maxLength: 140 },
  },
};

const QUEST_BLUEPRINTS = [
  {
    id: "laundry",
    title: "The Cotton Exorcism",
    monsterName: "Laundry Golem",
    discipline: "tidy",
    attributeReward: "willpower",
    estimateMinutes: 18,
    xpReward: 40,
    flavor: "Sort, fold, and send the cloth swarm to the washing dimension.",
  },
  {
    id: "dishes",
    title: "Hydra of Grime",
    monsterName: "Sink Hydra",
    discipline: "kitchen",
    attributeReward: "strength",
    estimateMinutes: 20,
    xpReward: 45,
    flavor: "Scrub each plate-head before more appear.",
  },
  {
    id: "bed",
    title: "Wrinkled Wasteland",
    monsterName: "Blanket Wyrm",
    discipline: "tidy",
    attributeReward: "charisma",
    estimateMinutes: 8,
    xpReward: 22,
    flavor: "Reclaim your bed and restore bedroom morale.",
  },
  {
    id: "desk",
    title: "Scrolls of Disorder",
    monsterName: "Paper Imp",
    discipline: "organize",
    attributeReward: "intellect",
    estimateMinutes: 15,
    xpReward: 36,
    flavor: "Stack your notes and purge stale coffee relics.",
  },
  {
    id: "trash",
    title: "Bin of Oblivion",
    monsterName: "Trash Slime",
    discipline: "tidy",
    attributeReward: "willpower",
    estimateMinutes: 9,
    xpReward: 30,
    flavor: "Bag the scattered trash to cleanse corruption.",
  },
  {
    id: "bathroom",
    title: "Mirror of Mists",
    monsterName: "Soap Phantom",
    discipline: "tidy",
    attributeReward: "charisma",
    estimateMinutes: 12,
    xpReward: 32,
    flavor: "Clear the mirror and sink to raise self-buff stats.",
  },
];

const sendJson = (response, statusCode, payload) => {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(body);
};

const readJsonBody = async (request) =>
  new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_SIZE_BYTES) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }
      raw += chunk;
    });
    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });

const normalizeBase64 = (value) => value.replace(/^data:[^;]+;base64,/, "").trim();
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const extractMessageText = (completionJson) => {
  const content = completionJson?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const textPart = content.find((part) => typeof part?.text === "string");
    if (textPart?.text) {
      return textPart.text;
    }
  }
  return "";
};

const requestCerebrasJson = async ({ system, user, schemaName, schema }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${CEREBRAS_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        temperature: 0.2,
        max_completion_tokens: 700,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Cerebras request failed (${response.status}): ${details}`);
    }

    const responseJson = await response.json();
    const outputText = extractMessageText(responseJson);
    if (!outputText.trim()) {
      throw new Error("Cerebras response did not include parseable output.");
    }

    return JSON.parse(outputText);
  } finally {
    clearTimeout(timeout);
  }
};

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const sampleBuffer = (buffer, maxSamples = 4096) => {
  if (buffer.length <= maxSamples) {
    return buffer;
  }
  const step = buffer.length / maxSamples;
  const sampled = Buffer.allocUnsafe(maxSamples);
  for (let i = 0; i < maxSamples; i += 1) {
    sampled[i] = buffer[Math.floor(i * step)];
  }
  return sampled;
};

const imageDescriptor = (base64Payload) => {
  const normalized = normalizeBase64(base64Payload);
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0) {
    throw new Error("Image payload is empty or invalid base64.");
  }
  const sample = sampleBuffer(buffer, 4096);
  const buckets = new Array(16).fill(0);
  let sum = 0;

  for (let i = 0; i < sample.length; i += 1) {
    const value = sample[i];
    sum += value;
    buckets[Math.floor(value / 16)] += 1;
  }

  let entropy = 0;
  for (const count of buckets) {
    if (count === 0) {
      continue;
    }
    const probability = count / sample.length;
    entropy -= probability * Math.log2(probability);
  }

  return {
    sizeBytes: buffer.length,
    entropy: Number(entropy.toFixed(3)),
    meanByte: Number((sum / sample.length).toFixed(2)),
    buckets: buckets.map((count) => Number((count / sample.length).toFixed(4))),
    signature: crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16),
  };
};

const selectCandidateQuests = (descriptor) => {
  const seed = hashString(`${descriptor.signature}:${descriptor.sizeBytes}:${descriptor.entropy}`);
  const ordered = [...QUEST_BLUEPRINTS].sort(
    (left, right) =>
      (hashString(`${left.id}:${seed}`) % QUEST_BLUEPRINTS.length) -
      (hashString(`${right.id}:${seed}`) % QUEST_BLUEPRINTS.length),
  );

  return ordered.slice(0, 3).map((template, index) => {
    const offset = (seed + index * 13) % 7;
    return {
      ...template,
      estimateMinutes: clamp(template.estimateMinutes + offset - 2, 3, 90),
      xpReward: clamp(template.xpReward + offset * 2, 10, 200),
      attributeDelta: 1 + ((seed + index) % 3),
      confidence: clamp(0.58 + ((seed + index * 11) % 35) / 100, 0, 1),
    };
  });
};

const compareDescriptors = (before, after) => {
  const bucketDistance = before.buckets.reduce(
    (distance, beforeBucket, index) => distance + Math.abs(beforeBucket - after.buckets[index]),
    0,
  );

  const sizeDelta = Math.abs(after.sizeBytes - before.sizeBytes) / Math.max(before.sizeBytes, 1);
  const entropyDelta = Math.abs(after.entropy - before.entropy);
  const meanDelta = Math.abs(after.meanByte - before.meanByte) / 255;

  return {
    identical: before.signature === after.signature,
    bucketDistance: Number(bucketDistance.toFixed(4)),
    sizeDelta: Number(sizeDelta.toFixed(4)),
    entropyDelta: Number(entropyDelta.toFixed(4)),
    meanDelta: Number(meanDelta.toFixed(4)),
  };
};

const sanitizeQuest = (quest, fallback, index) => ({
  id:
    typeof quest?.id === "string" && quest.id.trim()
      ? quest.id.trim().slice(0, 40)
      : `${fallback.id}-${Date.now()}-${index}`,
  title:
    typeof quest?.title === "string" && quest.title.trim()
      ? quest.title.trim().slice(0, 80)
      : fallback.title,
  monsterName:
    typeof quest?.monsterName === "string" && quest.monsterName.trim()
      ? quest.monsterName.trim().slice(0, 60)
      : fallback.monsterName,
  estimateMinutes: clamp(Number(quest?.estimateMinutes || fallback.estimateMinutes), 3, 90),
  xpReward: clamp(Number(quest?.xpReward || fallback.xpReward), 10, 200),
  discipline:
    quest?.discipline === "tidy" || quest?.discipline === "organize" || quest?.discipline === "kitchen"
      ? quest.discipline
      : fallback.discipline,
  attributeReward:
    quest?.attributeReward === "strength" ||
    quest?.attributeReward === "intellect" ||
    quest?.attributeReward === "charisma" ||
    quest?.attributeReward === "willpower"
      ? quest.attributeReward
      : fallback.attributeReward,
  attributeDelta: clamp(Number(quest?.attributeDelta || fallback.attributeDelta), 1, 3),
  flavor:
    typeof quest?.flavor === "string" && quest.flavor.trim()
      ? quest.flavor.trim().slice(0, 180)
      : fallback.flavor,
  confidence: clamp(Number(quest?.confidence || fallback.confidence), 0, 1),
});

const ensureCerebrasConfigured = (response) => {
  if (CEREBRAS_API_KEY) {
    return true;
  }
  sendJson(response, 503, {
    error: "CEREBRAS_API_KEY is missing. Set the server environment variable and retry.",
  });
  return false;
};

const handleScan = async (request, response) => {
  if (!ensureCerebrasConfigured(response)) {
    return;
  }

  const body = await readJsonBody(request);
  if (typeof body.beforeImageBase64 !== "string" || !body.beforeImageBase64.trim()) {
    sendJson(response, 400, { error: "beforeImageBase64 is required." });
    return;
  }

  let descriptor;
  try {
    descriptor = imageDescriptor(body.beforeImageBase64);
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Invalid beforeImageBase64 payload.",
    });
    return;
  }
  const candidates = selectCandidateQuests(descriptor);

  const parsed = await requestCerebrasJson({
    system: [
      "You are the Reality RPG quest writer.",
      "Return valid JSON only.",
      "You are given image fingerprint features and candidate chores, not the raw photo.",
      "Use only provided candidates; do not invent new disciplines or attributes.",
    ].join(" "),
    user: [
      `Scene descriptor: ${JSON.stringify(descriptor)}.`,
      `Candidate quests: ${JSON.stringify(candidates)}.`,
      "Pick 1 to 3 quests most likely relevant and write concise RPG narration.",
      "Keep confidence realistic (0 to 1).",
    ].join(" "),
    schemaName: "reality_rpg_scan",
    schema: SCAN_RESPONSE_SCHEMA,
  });

  const rawQuests = Array.isArray(parsed?.quests) ? parsed.quests : [];
  const quests = rawQuests
    .slice(0, 3)
    .map((quest, index) => sanitizeQuest(quest, candidates[index] ?? candidates[0], index));

  if (quests.length === 0) {
    quests.push(candidates[0]);
  }

  const narration =
    typeof parsed?.narration === "string" && parsed.narration.trim()
      ? parsed.narration.trim().slice(0, 220)
      : `Spirit Lens lock acquired. ${quests[0].monsterName} detected.`;

  sendJson(response, 200, {
    narration,
    quests,
    source: "cerebras",
  });
};

const handleVerify = async (request, response) => {
  if (!ensureCerebrasConfigured(response)) {
    return;
  }

  const body = await readJsonBody(request);
  if (typeof body.beforeImageBase64 !== "string" || !body.beforeImageBase64.trim()) {
    sendJson(response, 400, { error: "beforeImageBase64 is required." });
    return;
  }
  if (typeof body.afterImageBase64 !== "string" || !body.afterImageBase64.trim()) {
    sendJson(response, 400, { error: "afterImageBase64 is required." });
    return;
  }

  let beforeDescriptor;
  let afterDescriptor;
  try {
    beforeDescriptor = imageDescriptor(body.beforeImageBase64);
    afterDescriptor = imageDescriptor(body.afterImageBase64);
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Invalid image payload.",
    });
    return;
  }
  const diff = compareDescriptors(beforeDescriptor, afterDescriptor);

  if (diff.identical) {
    sendJson(response, 200, {
      success: false,
      confidence: 0.1,
      message: "Verification failed: after photo matches the before photo.",
      source: "cerebras",
    });
    return;
  }

  const questTitle = typeof body?.quest?.title === "string" ? body.quest.title : "Cleanup Quest";
  const questMonster =
    typeof body?.quest?.monsterName === "string" ? body.quest.monsterName : "Chaos Entity";

  const parsed = await requestCerebrasJson({
    system: [
      "You are the Reality RPG verification judge.",
      "Return valid JSON only.",
      "Use the before/after descriptors and difference metrics to decide whether a cleanup likely happened.",
      "Be conservative if metrics are ambiguous.",
    ].join(" "),
    user: [
      `Quest title: ${questTitle}.`,
      `Target mess entity: ${questMonster}.`,
      `Before descriptor: ${JSON.stringify(beforeDescriptor)}.`,
      `After descriptor: ${JSON.stringify(afterDescriptor)}.`,
      `Difference metrics: ${JSON.stringify(diff)}.`,
      "Set success=true only when there is strong evidence of change aligned with cleanup.",
    ].join(" "),
    schemaName: "reality_rpg_verify",
    schema: VERIFY_RESPONSE_SCHEMA,
  });

  sendJson(response, 200, {
    success: Boolean(parsed?.success),
    confidence: clamp(Number(parsed?.confidence || 0.5), 0, 1),
    message:
      typeof parsed?.message === "string" && parsed.message.trim()
        ? parsed.message.trim().slice(0, 140)
        : "Verification complete.",
    source: "cerebras",
  });
};

const server = http.createServer(async (request, response) => {
  try {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      });
      response.end();
      return;
    }

    if (method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        provider: "cerebras",
        model: CEREBRAS_MODEL,
        cerebrasConfigured: Boolean(CEREBRAS_API_KEY),
      });
      return;
    }

    if (method === "POST" && url.pathname === "/api/v1/scan") {
      await handleScan(request, response);
      return;
    }

    if (method === "POST" && url.pathname === "/api/v1/verify") {
      await handleVerify(request, response);
      return;
    }

    sendJson(response, 404, { error: "Route not found." });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`[reality-api] listening on http://localhost:${PORT}`);
});
