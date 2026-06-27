const THEME_ATTRIBUTE = "data-nyra-theme-studio";
const MATCH_ATTRIBUTE = "data-nyra-match-panels";
const OLED_ATTRIBUTE = "data-oled";
const STORAGE_KEY = "nyraThemeStudio";

const DEFAULT_THEME = {
  chatBackground: "#22202a",
  messageBubble: "#17151e",
  inputBox: "#2b2835",
  contentPanel: "#1f1d26",
  writingBlock: "#243a63",
  sidebar: "#1e1b26"
};

const DEFAULT_OPTIONS = {
  matchPanelColorCodes: false
};

const LEGACY_KEYS = {
  pageBackground: "chatBackground",
  mainBackground: "chatBackground",
  messageCards: "messageBubble",
  messageBackground: "messageBubble",
  composerBackground: "inputBox",
  composerBox: "inputBox",
  panelBackground: "contentPanel",
  codeBlockBackground: "contentPanel",
  contentPanelBackground: "contentPanel",
  sidebarBackground: "sidebar"
};

let activeTheme = { ...DEFAULT_THEME };
let options = { ...DEFAULT_OPTIONS };
let enabled = true;

function isHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  if (!isHex(hex)) {
    return { r: 34, g: 32, b: 42 };
  }

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}

function rgbToHex(rgb) {
  return `#${[rgb.r, rgb.g, rgb.b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("")}`;
}

function mix(baseHex, targetHex, amount) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);

  return rgbToHex({
    r: base.r + (target.r - base.r) * amount,
    g: base.g + (target.g - base.g) * amount,
    b: base.b + (target.b - base.b) * amount
  });
}

function transparentRgb(hex) {
  const rgb = hexToRgb(hex);
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / 0)`;
}

function sanitize(theme) {
  const migrated = { ...(theme || {}) };

  for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
    if (isHex(migrated[oldKey]) && !isHex(migrated[newKey])) {
      migrated[newKey] = migrated[oldKey];
    }
  }

  if (!isHex(migrated.writingBlock) && isHex(migrated.contentPanel)) {
    migrated.writingBlock = migrated.contentPanel;
  }

  const result = { ...DEFAULT_THEME };

  for (const key of Object.keys(DEFAULT_THEME)) {
    if (isHex(migrated[key])) {
      result[key] = migrated[key].toLowerCase();
    }
  }

  return result;
}

function normalizeOptions(_value) {
  return { matchPanelColorCodes: false };
}

function normalizeState(value) {
  if (!value || typeof value !== "object") {
    return { enabled: true, theme: { ...DEFAULT_THEME }, options: { ...DEFAULT_OPTIONS } };
  }

  if ("theme" in value || "enabled" in value || "options" in value) {
    return {
      enabled: value.enabled !== false,
      theme: sanitize(value.theme || value),
      options: normalizeOptions(value.options)
    };
  }

  return {
    enabled: true,
    theme: sanitize(value),
    options: { ...DEFAULT_OPTIONS }
  };
}

function buildTheme(theme) {
  const safeTheme = sanitize(theme);

  return {
    ...safeTheme,
    inputBorder: mix(safeTheme.inputBox, "#ffffff", 0.12),
    messageBorder: mix(safeTheme.messageBubble, "#ffffff", 0.07),
    contentPanelBorder: mix(safeTheme.contentPanel, "#ffffff", 0.08),
    contentPanelButton: mix(safeTheme.contentPanel, "#ffffff", 0.14),
    writingBlockBorder: mix(safeTheme.writingBlock, "#ffffff", 0.08),
    sidebarHover: mix(safeTheme.sidebar, "#ffffff", 0.08),
    sidebarSelected: mix(safeTheme.sidebar, "#ffffff", 0.16),
    inlineCode: mix(safeTheme.contentPanel, "#ffffff", 0.12)
  };
}

function setVar(name, value) {
  document.documentElement.style.setProperty(name, value, "important");
}

function removeVar(name) {
  document.documentElement.style.removeProperty(name);
}

function clearLegacyInlineMatches() {
  for (const element of document.querySelectorAll("[data-nyra-panel-color-match], [data-nyra-content-panel], [data-nyra-content-panel-header]")) {
    const originalStyle = element.getAttribute("data-nyra-original-style");

    if (originalStyle === "") {
      element.removeAttribute("style");
    } else if (originalStyle !== null) {
      element.setAttribute("style", originalStyle);
    }

    element.removeAttribute("data-nyra-original-style");
    element.removeAttribute("data-nyra-panel-color-match");
    element.removeAttribute("data-nyra-content-panel");
    element.removeAttribute("data-nyra-content-panel-header");
  }
}

function updateLayoutVariables() {
  if (!enabled) {
    clearLegacyInlineMatches();
    return;
  }

  if (document.documentElement.hasAttribute(OLED_ATTRIBUTE)) {
    document.documentElement.removeAttribute(OLED_ATTRIBUTE);
  }
}

function clearTheme() {
  enabled = false;
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  document.documentElement.removeAttribute(MATCH_ATTRIBUTE);
  document.documentElement.style.colorScheme = "";
  document.body?.removeAttribute(THEME_ATTRIBUTE);
  clearLegacyInlineMatches();

  for (const name of [
    "--nyra-chat-bg",
    "--nyra-chat-bg-transparent",
    "--nyra-message-bg",
    "--nyra-message-border",
    "--nyra-input-bg",
    "--nyra-input-border",
    "--nyra-panel-bg",
    "--nyra-panel-border",
    "--nyra-panel-button-bg",
    "--nyra-writing-block-bg",
    "--nyra-writing-block-border",
    "--nyra-sidebar-bg",
    "--nyra-sidebar-hover-bg",
    "--nyra-sidebar-selected-bg",
    "--nyra-code-bg",
    "--main-surface-primary",
    "--main-surface-secondary",
    "--main-surface-tertiary",
    "--surface-primary",
    "--surface-secondary",
    "--surface-tertiary",
    "--bg-elevated-primary",
    "--bg-elevated-secondary",
    "--bg-elevated-tertiary",
    "--sidebar-surface-primary",
    "--sidebar-surface-secondary",
    "--composer-surface",
    "--composer-surface-primary",
    "--message-surface"
  ]) {
    removeVar(name);
  }
}

function applyTheme(theme, shouldEnable = true, nextOptions = options) {
  enabled = shouldEnable !== false;
  options = normalizeOptions(nextOptions);

  if (!enabled) {
    clearTheme();
    return;
  }

  activeTheme = sanitize(theme);
  const fullTheme = buildTheme(activeTheme);

  document.documentElement.setAttribute(THEME_ATTRIBUTE, "on");
  document.documentElement.setAttribute(MATCH_ATTRIBUTE, "off");
  document.documentElement.style.colorScheme = "dark";

  setVar("--nyra-chat-bg", fullTheme.chatBackground);
  setVar("--nyra-chat-bg-transparent", transparentRgb(fullTheme.chatBackground));
  setVar("--nyra-message-bg", fullTheme.messageBubble);
  setVar("--nyra-message-border", fullTheme.messageBorder);
  setVar("--nyra-input-bg", fullTheme.inputBox);
  setVar("--nyra-input-border", fullTheme.inputBorder);
  setVar("--nyra-panel-bg", fullTheme.contentPanel);
  setVar("--nyra-panel-border", fullTheme.contentPanelBorder);
  setVar("--nyra-panel-button-bg", fullTheme.contentPanelButton);
  setVar("--nyra-writing-block-bg", fullTheme.writingBlock);
  setVar("--nyra-writing-block-border", fullTheme.writingBlockBorder);
  setVar("--nyra-sidebar-bg", fullTheme.sidebar);
  setVar("--nyra-sidebar-hover-bg", fullTheme.sidebarHover);
  setVar("--nyra-sidebar-selected-bg", fullTheme.sidebarSelected);
  setVar("--nyra-code-bg", fullTheme.inlineCode);

  setVar("--main-surface-primary", "var(--nyra-chat-bg)");
  setVar("--surface-primary", "var(--nyra-chat-bg)");
  setVar("--sidebar-surface-primary", "var(--nyra-sidebar-bg)");
  setVar("--sidebar-surface-secondary", "var(--nyra-sidebar-hover-bg)");
  setVar("--composer-surface", "var(--nyra-input-bg)");
  setVar("--composer-surface-primary", "var(--nyra-input-bg)");
  setVar("--message-surface", "var(--nyra-message-bg)");

  removeVar("--main-surface-secondary");
  removeVar("--main-surface-tertiary");
  removeVar("--surface-secondary");
  removeVar("--surface-tertiary");
  removeVar("--bg-elevated-primary");
  removeVar("--bg-elevated-secondary");
  removeVar("--bg-elevated-tertiary");

  if (document.body) {
    document.body.setAttribute(THEME_ATTRIBUTE, "on");
  }

  updateLayoutVariables();
}

function loadTheme() {
  chrome.storage.local.get({ [STORAGE_KEY]: { enabled: true, theme: DEFAULT_THEME, options: DEFAULT_OPTIONS } }, (result) => {
    const state = normalizeState(result[STORAGE_KEY]);
    applyTheme(state.theme, state.enabled, state.options);
  });
}

function installListeners() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }

    const state = normalizeState(changes[STORAGE_KEY].newValue);
    applyTheme(state.theme, state.enabled, state.options);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "NYRA_THEME_APPLY") {
      return false;
    }

    applyTheme(message.theme || DEFAULT_THEME, message.enabled !== false, message.options || DEFAULT_OPTIONS);
    sendResponse({ ok: true });
    return true;
  });
}

/* ChatGPT often scrolls an inner conversation container instead of the page.
   We only force an initial jump to the bottom during startup. */
const START_AT_BOTTOM_DELAYS = [0, 120, 260, 500, 900];
const START_AT_BOTTOM_KEYS = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
let startAtBottomTimers = [];

function isDocumentScroller(element) {
  return element === document.scrollingElement || element === document.documentElement || element === document.body;
}

function hasVerticalScroll(element) {
  if (!element) {
    return false;
  }

  if (isDocumentScroller(element)) {
    return element.scrollHeight > Math.max(window.innerHeight || 0, element.clientHeight || 0) + 2;
  }

  const style = getComputedStyle(element);
  const permitsScroll = /(auto|scroll|overlay)/.test(style.overflowY);
  return permitsScroll && element.scrollHeight > element.clientHeight + 2;
}

function getConversationRoot() {
  return document.getElementById("thread")
    || document.querySelector("section[data-testid^='conversation-turn-']");
}

function findConversationScroller() {
  const conversationRoot = getConversationRoot();

  for (let element = conversationRoot; element; element = element.parentElement) {
    if (hasVerticalScroll(element)) {
      return element;
    }
  }

  const documentScroller = document.scrollingElement || document.documentElement;

  if (hasVerticalScroll(documentScroller)) {
    return documentScroller;
  }

  const candidates = document.querySelectorAll(
    conversationRoot
      ? "main, [role='main'], .overflow-y-auto, .overflow-auto"
      : "main, [role='main']"
  );
  let bestCandidate = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    if (!hasVerticalScroll(candidate)) {
      continue;
    }

    const containsConversation = conversationRoot && candidate.contains(conversationRoot);
    const score = (containsConversation ? 1_000_000 : 0)
      + Math.max(0, candidate.clientHeight)
      + Math.max(0, candidate.scrollHeight - candidate.clientHeight);

    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate || documentScroller;
}

function setScrollTop(scroller, value) {
  const y = Math.max(0, Number(value) || 0);

  if (!scroller) {
    return;
  }

  if (isDocumentScroller(scroller)) {
    window.scrollTo({ top: y, left: window.scrollX || 0, behavior: "auto" });
    scroller.scrollTop = y;
    return;
  }

  scroller.scrollTop = y;
}

function clearStartAtBottomTimers() {
  for (const timer of startAtBottomTimers) {
    clearTimeout(timer);
  }

  startAtBottomTimers = [];
}

function scrollConversationToBottom() {
  const scroller = findConversationScroller();

  if (!scroller || !hasVerticalScroll(scroller)) {
    return false;
  }

  const maxTop = Math.max(
    0,
    scroller.scrollHeight - (
      isDocumentScroller(scroller)
        ? Math.max(window.innerHeight || 0, scroller.clientHeight || 0)
        : scroller.clientHeight
    )
  );

  setScrollTop(scroller, maxTop);
  return maxTop > 0;
}

function scheduleStartAtBottom() {
  clearStartAtBottomTimers();

  for (const delay of START_AT_BOTTOM_DELAYS) {
    startAtBottomTimers.push(setTimeout(() => {
      scrollConversationToBottom();
    }, delay));
  }
}

function installStartAtBottom() {
  if (window.__nyraStartAtBottomInstalled) {
    return;
  }

  window.__nyraStartAtBottomInstalled = true;
  const stopForUser = () => clearStartAtBottomTimers();

  window.addEventListener("wheel", stopForUser, { passive: true });
  window.addEventListener("touchstart", stopForUser, { passive: true });
  window.addEventListener("pointerdown", stopForUser, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (START_AT_BOTTOM_KEYS.includes(event.key)) {
      stopForUser();
    }
  }, { passive: true });
  window.addEventListener("pageshow", scheduleStartAtBottom, { passive: true });
}

loadTheme();
installListeners();
installStartAtBottom();

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(activeTheme, enabled, options);
  setTimeout(updateLayoutVariables, 250);
  scheduleStartAtBottom();
}, { once: true });

requestAnimationFrame(() => {
  applyTheme(activeTheme, enabled, options);
  scheduleStartAtBottom();
});
