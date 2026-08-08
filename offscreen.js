const WORKER_COUNT = 2;
const INSTRUCTION = "Rewrite the supplied X post as concise, playful Grug speak. Preserve URLs, @handles, #hashtags, numbers, emoji, proper names, and meaning. Return only the rewritten post: no label, explanation, quotes, or Markdown.";

let poolPromise;
const idle = [];
const waiters = [];

async function createWorker() {
  const session = await LanguageModel.create({
    expectedInputLanguages: ["en"],
    expectedOutputLanguages: ["en"],
    initialPrompts: [{ role: "system", content: INSTRUCTION }]
  });
  idle.push(session);
}

async function ensurePool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      if (typeof LanguageModel === "undefined") throw new Error("Chrome on-device AI is not enabled");
      const availability = await LanguageModel.availability({ languages: ["en"] });
      if (availability !== "available") throw new Error(`Chrome on-device AI is ${availability}`);
      await Promise.all(Array.from({ length: WORKER_COUNT }, createWorker));
    })();
  }
  return poolPromise;
}

async function lease() {
  await ensurePool();
  if (idle.length) return idle.pop();
  return new Promise((resolve) => waiters.push(resolve));
}

function release(session) {
  const next = waiters.shift();
  if (next) next(session);
  else idle.push(session);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "OFFSCREEN_TRANSFORM") return;
  (async () => {
    if (!Array.isArray(message.texts) || message.texts.length !== 1) throw new Error("Expected one post per request");
    const worker = await lease();
    try {
      const answer = await worker.prompt(message.texts[0]);
      sendResponse({ texts: [cleanText(answer)], engine: "Chrome on-device AI" });
    } finally {
      release(worker);
    }
  })().catch((error) => sendResponse({
    texts: message.texts.map(quickGrug),
    engine: "fallback",
    error: error.message
  }));
  return true;
});

function cleanText(answer) {
  return answer.trim().replace(/^```(?:text)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function quickGrug(text) {
  return text.replace(/\bthe\b/gi, "da").replace(/\band\b/gi, "an").replace(/\byou\b/gi, "u").replace(/\byour\b/gi, "ur").replace(/\bI\b/g, "me");
}
