const enabled = document.querySelector("#enabled");
const status = document.querySelector("#status");

chrome.storage.sync.get({ enabled: true }, ({ enabled: value }) => enabled.checked = value);
enabled.addEventListener("change", () => chrome.storage.sync.set({ enabled: enabled.checked }));

(async () => {
  try {
    if (typeof LanguageModel === "undefined") throw new Error("not exposed");
    const state = await LanguageModel.availability({ languages: ["en"] });
    status.textContent = state === "available" ? "Chrome local AI ready. Grug think good." : `Chrome local AI: ${state}. Basic Grug mode will work.`;
  } catch {
    status.textContent = "Chrome local AI is off. Basic Grug mode will work.";
  }
})();
