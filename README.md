# Grug Talk

Grug Talk is a dependency-free Manifest V3 Chrome extension that rewrites posts on [X](https://x.com) as concise, playful Grug speak.

It uses Chrome's built-in Prompt API (`LanguageModel`) when available, so post text stays on your device. If the local model is unavailable, the extension falls back to a small rule-based transformer that also runs entirely in the browser.

## Features

- Rewrites visible posts on `x.com` and `twitter.com`
- Uses Chrome's on-device language model when available
- Shows an immediate local preview while the model generates a result
- Processes posts near the viewport rather than the entire timeline
- Includes a popup switch to enable or disable rewriting
- Sends no timeline text to a remote server

## Install

No package manager, build step, or external dependency is required.

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.
6. Open or reload [x.com](https://x.com).

The status badge on X displays `local AI` when Chrome's Prompt API is active and `basic` when the fallback transformer is being used.

## Enable Chrome's Local AI

Local AI support is optional. The extension works in basic mode without it.

1. Open `chrome://flags/#prompt-api-for-gemini-nano` in Chrome.
2. Set the Prompt API flag to **Enabled** and relaunch Chrome.
3. Open `chrome://on-device-internals` and wait for the model to finish downloading.
4. Reload the extension from `chrome://extensions`, then reload X.

Chrome's built-in AI availability and flag names can vary between Chrome releases. The first model download may be large.

## Usage

Open X after installing the extension. Posts are rewritten automatically as they approach the viewport. Select the extension icon to turn Grug mode on or off, then reload X after changing the setting.

The extension only rewrites rendered post text. It does not change text in the post composer or modify posts before they are sent.

## How It Works

- `content.js` observes timeline posts and queues visible text for transformation.
- `service-worker.js` coordinates requests with an offscreen extension document.
- `offscreen.js` maintains a small pool of Chrome Prompt API sessions and applies the local fallback when needed.
- `popup.html` and `popup.js` provide the enable switch and local AI status.

## Privacy

Grug Talk has no analytics, network service, or remote model integration. It requests access only to X/Twitter pages and Chrome storage for the enabled setting. With the Prompt API active, model inference happens through Chrome's on-device model.
