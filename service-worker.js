importScripts("grug.js");

const OFFSCREEN_URL = "offscreen.html";

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
  });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["WORKERS"],
      justification: "Run Chrome's on-device language model outside the page."
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "GRUG_TRANSFORM") return;
  (async () => {
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage({
      type: "OFFSCREEN_TRANSFORM",
      texts: message.texts
    });
    sendResponse(response);
  })().catch((error) => sendResponse({
    texts: message.texts.map(quickGrug),
    engine: "fallback",
    error: error.message
  }));
  return true;
});
