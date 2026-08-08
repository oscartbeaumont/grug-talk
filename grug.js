// One Grug. Three places used to keep their own Grug, and the three Grugs
// disagreed: only the service worker knew "please" and "hello", and only the
// offscreen document forgot "very" and "I am". Now everyone shares this rock.

const RULES = [
  [/\bI am\b/g, "me"],
  [/\bthe\b/gi, "da"],
  [/\band\b/gi, "an"],
  [/\byour\b/gi, "ur"],
  [/\byou\b/gi, "u"],
  [/\bvery\b/gi, "big"],
  [/\bplease\b/gi, "plz"],
  [/\bhello\b/gi, "grug hello"],
  [/\bI\b/g, "me"]
];

// Links, handles, hashtags and cashtags are shiny rocks. Grug no chew shiny
// rock. Without this, "x.com/i/the/status" became "x.com/i/da/status" and the
// link stopped working, which the on-device AI prompt already promises not to do.
const SHINY = /(?:https?:\/\/|www\.)\S+|[@#$]\w+|\S+\.(?:com|org|net|io|dev|co|gg|xyz|ai)\b\S*/gi;

// Guillemets mark a hidden rock. No rule above can match them, so a post that
// genuinely says "3" is never mistaken for shiny rock number three.
const MARKER = /«(\d+)»/g;

function quickGrug(text) {
  const shiny = [];
  const masked = text.replace(SHINY, (match) => "«" + (shiny.push(match) - 1) + "»");
  const translated = RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), masked);
  // If a post really did contain a marker, leave it be rather than dropping it.
  return translated.replace(MARKER, (match, index) => shiny[Number(index)] ?? match);
}

globalThis.quickGrug = quickGrug;
