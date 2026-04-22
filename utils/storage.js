const HISTORY_KEY = "hyc_choice_history";
const SETTINGS_KEY = "hyc_app_settings";
const CUSTOM_TEMPLATE_KEY = "hyc_custom_templates";
const { clampThemeIndex, getThemeByIndex } = require("./theme");

function ensureDefaults() {
  const settings = wx.getStorageSync(SETTINGS_KEY);
  if (!settings) {
    wx.setStorageSync(SETTINGS_KEY, {
      animationsEnabled: true,
      autoReduceOnLowEnd: true,
      lowEndDevice: false,
      lowEndChecked: false,
      themeIndex: 0,
    });
    return;
  }
  const merged = {
    animationsEnabled: settings.animationsEnabled !== false,
    autoReduceOnLowEnd: settings.autoReduceOnLowEnd !== false,
    lowEndDevice: !!settings.lowEndDevice,
    lowEndChecked: !!settings.lowEndChecked,
    themeIndex: clampThemeIndex(settings.themeIndex || 0),
  };
  wx.setStorageSync(SETTINGS_KEY, merged);
}

function getSettings() {
  ensureDefaults();
  return wx.getStorageSync(SETTINGS_KEY);
}

function saveSettings(nextSettings) {
  wx.setStorageSync(SETTINGS_KEY, nextSettings);
}

function detectLowEndDevice() {
  try {
    const info = wx.getSystemInfoSync();
    if (typeof info.benchmarkLevel === "number") {
      if (info.benchmarkLevel >= 0) return info.benchmarkLevel < 25;
    }
    const model = `${info.model || ""}`.toLowerCase();
    const platform = `${info.platform || ""}`.toLowerCase();
    const oldIOS = /iphone\s?[6-8]|iphone\s?x/.test(model);
    const oldAndroid = /oppo a|vivo y|redmi [4-8]|mi 5|mi 6|honor [7-8]/.test(model);
    if (platform === "ios") return oldIOS;
    if (platform === "android") return oldAndroid;
  } catch (_) {}
  return false;
}

function getSmartSettings() {
  const settings = getSettings();
  if (!settings.lowEndChecked) {
    const lowEndDevice = detectLowEndDevice();
    const next = {
      ...settings,
      lowEndDevice,
      lowEndChecked: true,
    };
    saveSettings(next);
    return next;
  }
  return settings;
}

function shouldPlayAnimation() {
  const settings = getSmartSettings();
  if (!settings.animationsEnabled) return false;
  if (settings.autoReduceOnLowEnd && settings.lowEndDevice) return false;
  return true;
}

function getCurrentTheme() {
  const settings = getSmartSettings();
  return getThemeByIndex(settings.themeIndex);
}

function getHistory() {
  const list = wx.getStorageSync(HISTORY_KEY) || [];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

function getCustomTemplates() {
  const list = wx.getStorageSync(CUSTOM_TEMPLATE_KEY) || [];
  return list.sort((a, b) => {
    const ta = Number(a.createdAt || 0);
    const tb = Number(b.createdAt || 0);
    return tb - ta;
  });
}

function saveCustomTemplates(list) {
  wx.setStorageSync(CUSTOM_TEMPLATE_KEY, list);
}

function setCustomTemplates(list) {
  const safe = Array.isArray(list) ? list : [];
  saveCustomTemplates(safe);
}

function upsertCustomTemplate(template) {
  const list = getCustomTemplates();
  const idx = list.findIndex((it) => it.id === template.id);
  const next = {
    ...template,
    usageCount: Number(template.usageCount || 0),
    createdAt: Number(template.createdAt || Date.now()),
    updatedAt: Date.now(),
  };
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...next,
    };
  } else {
    list.unshift(next);
  }
  saveCustomTemplates(list);
}

function removeCustomTemplate(id) {
  const list = getCustomTemplates().filter((it) => it.id !== id);
  saveCustomTemplates(list);
}

function bumpCustomTemplateUsage(id) {
  const list = getCustomTemplates();
  const idx = list.findIndex((it) => it.id === id);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    usageCount: Number(list[idx].usageCount || 0) + 1,
    updatedAt: Date.now(),
  };
  saveCustomTemplates(list);
}

function buildBackupPayload() {
  return {
    version: 1,
    exportedAt: Date.now(),
    settings: getSmartSettings(),
    history: getHistory(),
    customTemplates: getCustomTemplates(),
  };
}

function exportBackupJson() {
  return JSON.stringify(buildBackupPayload(), null, 2);
}

function normalizeSettings(input) {
  const base = getSettings();
  if (!input || typeof input !== "object") return base;
  return {
    ...base,
    animationsEnabled: input.animationsEnabled !== false,
    autoReduceOnLowEnd: input.autoReduceOnLowEnd !== false,
    lowEndDevice: !!input.lowEndDevice,
    lowEndChecked: !!input.lowEndChecked,
    themeIndex: clampThemeIndex(input.themeIndex || 0),
  };
}

function normalizeHistory(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      id: `${item.id || `h_${Date.now()}_${Math.floor(Math.random() * 10000)}`}`,
      question: `${item.question || ""}`.trim(),
      options: Array.isArray(item.options)
        ? item.options.map((it) => `${it}`.trim()).filter(Boolean)
        : [],
      result: `${item.result || ""}`.trim(),
      createdAt: Number(item.createdAt || Date.now()),
    }))
    .filter((item) => item.question && item.options.length >= 2 && item.result);
}

function normalizeCustomTemplates(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      id: `${item.id || `tpl_${Date.now()}_${Math.floor(Math.random() * 10000)}`}`,
      title: `${item.title || ""}`.trim(),
      question: `${item.question || ""}`.trim(),
      options: Array.isArray(item.options)
        ? item.options.map((it) => `${it}`.trim()).filter(Boolean)
        : [],
      icon: `${item.icon || "✨"}`,
      usageCount: Number(item.usageCount || 0),
      createdAt: Number(item.createdAt || Date.now()),
      updatedAt: Number(item.updatedAt || Date.now()),
    }))
    .filter((item) => item.title && item.question && item.options.length >= 2);
}

function analyzeBackupJson(rawJson, mode = "replace") {
  if (!rawJson || typeof rawJson !== "string") {
    return { ok: false, message: "备份内容为空" };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(rawJson);
  } catch (_) {
    return { ok: false, message: "JSON 格式不正确" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "备份结构无效" };
  }

  const incomingHistory = normalizeHistory(parsed.history);
  const incomingTemplates = normalizeCustomTemplates(parsed.customTemplates);
  const incomingSettings = normalizeSettings(parsed.settings);
  const currentHistory = getHistory();
  const currentTemplates = getCustomTemplates();

  let resultHistoryCount = incomingHistory.length;
  let resultTemplateCount = incomingTemplates.length;
  if (mode === "merge") {
    const historyMap = new Map();
    currentHistory.forEach((item) => historyMap.set(item.id, item));
    incomingHistory.forEach((item) => historyMap.set(item.id, item));
    resultHistoryCount = historyMap.size;

    const templateMap = new Map();
    currentTemplates.forEach((item) => templateMap.set(item.id, item));
    incomingTemplates.forEach((item) => templateMap.set(item.id, item));
    resultTemplateCount = templateMap.size;
  }

  return {
    ok: true,
    message: "备份内容可用",
    normalized: {
      history: incomingHistory,
      customTemplates: incomingTemplates,
      settings: incomingSettings,
    },
    preview: {
      mode,
      incoming: {
        history: incomingHistory.length,
        customTemplates: incomingTemplates.length,
      },
      current: {
        history: currentHistory.length,
        customTemplates: currentTemplates.length,
      },
      result: {
        history: resultHistoryCount,
        customTemplates: resultTemplateCount,
      },
      settings: incomingSettings,
    },
  };
}

function importBackupJson(rawJson, mode = "replace") {
  const analyzed = analyzeBackupJson(rawJson, mode);
  if (!analyzed.ok) return analyzed;
  const incomingHistory = analyzed.normalized.history;
  const incomingTemplates = analyzed.normalized.customTemplates;
  const incomingSettings = analyzed.normalized.settings;

  if (mode === "merge") {
    const historyMap = new Map();
    getHistory().forEach((item) => historyMap.set(item.id, item));
    incomingHistory.forEach((item) => historyMap.set(item.id, item));
    setHistory(Array.from(historyMap.values()));

    const tplMap = new Map();
    getCustomTemplates().forEach((item) => tplMap.set(item.id, item));
    incomingTemplates.forEach((item) => tplMap.set(item.id, item));
    setCustomTemplates(Array.from(tplMap.values()));
  } else {
    setHistory(incomingHistory);
    setCustomTemplates(incomingTemplates);
  }
  saveSettings(incomingSettings);

  return {
    ok: true,
    message: "恢复成功",
    counts: {
      history: analyzed.preview.result.history,
      customTemplates: analyzed.preview.result.customTemplates,
    },
  };
}

function saveHistory(list) {
  wx.setStorageSync(HISTORY_KEY, list);
}

function setHistory(list) {
  const safe = Array.isArray(list) ? list : [];
  saveHistory(safe);
}

function appendHistory(item) {
  const list = getHistory();
  list.unshift(item);
  saveHistory(list);
}

function removeHistory(id) {
  const list = getHistory().filter((it) => it.id !== id);
  saveHistory(list);
}

function clearHistory() {
  wx.setStorageSync(HISTORY_KEY, []);
}

function getStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekStart = todayStart - (now.getDay() === 0 ? 6 : now.getDay() - 1) * dayMs;
  const list = getHistory();

  let today = 0;
  let week = 0;
  list.forEach((item) => {
    if (item.createdAt >= todayStart) today += 1;
    if (item.createdAt >= weekStart) week += 1;
  });

  return {
    total: list.length,
    today,
    thisWeek: week,
  };
}

module.exports = {
  ensureDefaults,
  getSettings,
  getSmartSettings,
  saveSettings,
  shouldPlayAnimation,
  detectLowEndDevice,
  getCurrentTheme,
  getHistory,
  appendHistory,
  removeHistory,
  clearHistory,
  getCustomTemplates,
  setCustomTemplates,
  upsertCustomTemplate,
  removeCustomTemplate,
  bumpCustomTemplateUsage,
  exportBackupJson,
  analyzeBackupJson,
  importBackupJson,
  setHistory,
  getStats,
};
