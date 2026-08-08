const WORKER_COUNT = 2;
const NEAR_VIEWPORT = "500px 0px";
let enabled = true;
let observer;
let active = 0;
const queue = [];
const queued = new WeakSet();

chrome.storage.sync.get({ enabled: true }, ({ enabled: stored }) => {
  enabled = stored;
  if (enabled) start();
});

chrome.storage.onChanged.addListener((changes) => {
  if (!changes.enabled) return;
  enabled = changes.enabled.newValue;
  if (enabled) start();
});

function start() {
  if (observer) return;
  document.addEventListener("click", onToggleClick);
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) enqueue(entry.target);
  }, { rootMargin: NEAR_VIEWPORT });

  scan();
  new MutationObserver(() => requestAnimationFrame(scan)).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function scan() {
  if (!enabled) return;
  ensurePostControls();
  for (const element of document.querySelectorAll('[data-testid="tweetText"]')) {
    const rendered = element.innerText;
    // X virtualizes the timeline and may reuse a DOM element for a new tweet.
    // If React supplied different content, make that element eligible again.
    if (element.dataset.grugRendered && element.dataset.grugRendered !== rendered) {
      delete element.dataset.grugState;
      delete element.dataset.grugRendered;
      queued.delete(element);
    }
    observer.observe(element);
  }
}

function enqueue(element) {
  if (!enabled || element.closest("[data-grug-disabled]") || queued.has(element) || element.dataset.grugState === "done") return;
  const source = element.innerText.trim();
  if (!source || source.length < 3) return;

  queued.add(element);
  element.dataset.grugState = "pending";
  element.dataset.grugSource = source;

  // Render an instant local preview. The full on-device AI result replaces it
  // once ready, so scrolling never waits on inference.
  const preview = quickGrug(source);
  replaceText(element, preview);
  element.dataset.grugRendered = preview;
  queue.push(element);
  pump();
}

function pump() {
  while (enabled && active < WORKER_COUNT && queue.length) {
    const element = queue.shift();
    if (!element.isConnected || element.dataset.grugState !== "pending") continue;
    transform(element);
  }
}

async function transform(element) {
  active += 1;
  const source = element.dataset.grugSource;
  try {
    const result = await chrome.runtime.sendMessage({ type: "GRUG_TRANSFORM", texts: [source] });
    if (element.isConnected && !element.closest("[data-grug-disabled]") && element.dataset.grugSource === source && typeof result.texts?.[0] === "string") {
      replaceText(element, result.texts[0]);
      element.dataset.grugRendered = result.texts[0];
      element.dataset.grugState = "done";
      showStatus(result.engine, result.error);
    }
  } catch (error) {
    if (element.isConnected && element.dataset.grugSource === source) {
      element.dataset.grugState = "done";
      showStatus("fallback", error.message);
    }
  } finally {
    active -= 1;
    pump();
  }
}

function ensurePostControls() {
  for (const article of document.querySelectorAll("article")) {
    if (article.querySelector("[data-grug-toggle]")) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.grugToggle = "";
    button.style.cssText = "margin:6px 0 2px;padding:3px 7px;border:1px solid #536471;border-radius:999px;background:transparent;color:#8b98a5;font:600 11px system-ui;cursor:pointer";
    setToggleLabel(button, false);
    // This sits after the tweet body so React's action bar remains untouched.
    article.append(button);
  }
}

function onToggleClick(event) {
  const button = event.target.closest("[data-grug-toggle]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const article = button.closest("article");
  if (!article) return;

  const disabled = article.toggleAttribute("data-grug-disabled");
  for (const element of article.querySelectorAll('[data-testid="tweetText"]')) {
    if (disabled) {
      const source = element.dataset.grugSource;
      if (source) replaceText(element, source);
      delete element.dataset.grugState;
      delete element.dataset.grugRendered;
      queued.delete(element);
    } else {
      delete element.dataset.grugState;
      delete element.dataset.grugRendered;
      queued.delete(element);
      observer.observe(element);
      enqueue(element);
    }
  }
  setToggleLabel(button, disabled);
}

function setToggleLabel(button, disabled) {
  button.textContent = disabled ? "🦴 Grug: off" : "🦴 Grug: on";
  button.setAttribute("aria-pressed", String(!disabled));
}

function replaceText(element, text) {
  element.textContent = text;
}

function showStatus(engine, error) {
  let badge = document.querySelector("[data-grug-status]");
  if (!badge) {
    badge = document.createElement("div");
    badge.dataset.grugStatus = "";
    badge.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:999999;background:#3b2518;color:#fff;padding:8px 11px;border-radius:999px;font:600 12px system-ui;box-shadow:0 2px 12px #0008";
    document.body.append(badge);
  }
  badge.textContent = engine === "Chrome on-device AI" ? "🦴 Grug mode · local AI" : "🦴 Grug mode · basic";
  badge.title = error ? `Local AI unavailable: ${error}` : "";
}
