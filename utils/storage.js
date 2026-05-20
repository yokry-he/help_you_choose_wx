const HISTORY_KEY = "hyc_choice_history";
const SETTINGS_KEY = "hyc_app_settings";
const CUSTOM_TEMPLATE_KEY = "hyc_custom_templates";
const ENGAGEMENT_KEY = "hyc_engagement";
const { clampThemeIndex, getThemeByIndex } = require("./theme");

const TONE_PACK_OPTIONS = [
  { key: "auto", label: "智能匹配" },
  { key: "cute", label: "可爱" },
  { key: "teasing", label: "轻吐槽" },
  { key: "healing", label: "治愈" },
  { key: "serious", label: "决策官" },
];

const BADGE_DEFS = [
  { id: "first_pick", name: "初来乍到", desc: "完成第 1 次抽选", icon: "🌱" },
  { id: "streak_3", name: "三日不倒", desc: "连续 3 天使用", icon: "🔥" },
  { id: "streak_7", name: "一周坚持", desc: "连续 7 天使用", icon: "⭐" },
  { id: "total_10", name: "选择老手", desc: "累计抽选 10 次", icon: "🎯" },
  { id: "total_50", name: "纠结终结者", desc: "累计抽选 50 次", icon: "🏆" },
  { id: "week_5", name: "本周达人", desc: "本周抽选 5 次", icon: "⚡" },
];

function formatDateKey(timestamp) {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDateKey(dateKey, deltaDays) {
  const parts = `${dateKey || ""}`.split("-").map(Number);
  if (parts.length !== 3) return dateKey;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + deltaDays);
  return formatDateKey(d.getTime());
}

function ensureDefaults() {
  const settings = wx.getStorageSync(SETTINGS_KEY);
  if (!settings) {
    wx.setStorageSync(SETTINGS_KEY, {
      animationsEnabled: true,
      autoReduceOnLowEnd: true,
      lowEndDevice: false,
      lowEndChecked: false,
      themeIndex: 0,
      shakeEnabled: true,
      hapticEnabled: true,
      soundEnabled: true,
      tonePack: "auto",
    });
    return;
  }
  const merged = {
    animationsEnabled: settings.animationsEnabled !== false,
    autoReduceOnLowEnd: settings.autoReduceOnLowEnd !== false,
    lowEndDevice: !!settings.lowEndDevice,
    lowEndChecked: !!settings.lowEndChecked,
    themeIndex: clampThemeIndex(settings.themeIndex || 0),
    shakeEnabled: settings.shakeEnabled !== false,
    hapticEnabled: settings.hapticEnabled !== false,
    soundEnabled: settings.soundEnabled !== false,
    tonePack: normalizeTonePack(settings.tonePack),
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

function normalizeTonePack(value) {
  const key = `${value || "auto"}`;
  const allowed = TONE_PACK_OPTIONS.map((item) => item.key);
  return allowed.includes(key) ? key : "auto";
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

function normalizeEngagement(input) {
  if (!input || typeof input !== "object") {
    return getEngagementRaw();
  }
  return {
    lastActiveDate: `${input.lastActiveDate || ""}`,
    currentStreak: Math.max(0, Number(input.currentStreak || 0)),
    longestStreak: Math.max(0, Number(input.longestStreak || 0)),
    earnedBadges: Array.isArray(input.earnedBadges)
      ? input.earnedBadges.map((id) => `${id}`.trim()).filter(Boolean)
      : [],
  };
}

function mergeEngagement(current, incoming) {
  const earned = new Set([
    ...(current.earnedBadges || []),
    ...(incoming.earnedBadges || []),
  ]);
  return {
    lastActiveDate: incoming.lastActiveDate || current.lastActiveDate,
    currentStreak: Math.max(current.currentStreak, incoming.currentStreak),
    longestStreak: Math.max(current.longestStreak, incoming.longestStreak),
    earnedBadges: Array.from(earned),
  };
}

function buildBackupPayload() {
  return {
    version: 1,
    exportedAt: Date.now(),
    settings: getSmartSettings(),
    history: getHistory(),
    customTemplates: getCustomTemplates(),
    engagement: getEngagementRaw(),
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
    shakeEnabled: input.shakeEnabled !== false,
    hapticEnabled: input.hapticEnabled !== false,
    soundEnabled: input.soundEnabled !== false,
    tonePack: normalizeTonePack(input.tonePack),
  };
}

function getEngagementRaw() {
  const raw = wx.getStorageSync(ENGAGEMENT_KEY);
  if (!raw || typeof raw !== "object") {
    return {
      lastActiveDate: "",
      currentStreak: 0,
      longestStreak: 0,
      earnedBadges: [],
    };
  }
  return {
    lastActiveDate: `${raw.lastActiveDate || ""}`,
    currentStreak: Number(raw.currentStreak || 0),
    longestStreak: Number(raw.longestStreak || 0),
    earnedBadges: Array.isArray(raw.earnedBadges) ? raw.earnedBadges : [],
  };
}

function saveEngagement(data) {
  wx.setStorageSync(ENGAGEMENT_KEY, data);
}

function computeBadgeProgress(stats, engagement) {
  const earned = new Set(engagement.earnedBadges || []);
  const progress = {
    first_pick: stats.total >= 1,
    streak_3: engagement.currentStreak >= 3,
    streak_7: engagement.currentStreak >= 7,
    total_10: stats.total >= 10,
    total_50: stats.total >= 50,
    week_5: stats.thisWeek >= 5,
  };
  const newlyEarned = [];
  BADGE_DEFS.forEach((badge) => {
    if (progress[badge.id] && !earned.has(badge.id)) {
      newlyEarned.push(badge.id);
      earned.add(badge.id);
    }
  });
  return {
    earnedBadges: Array.from(earned),
    newlyEarned,
    badges: BADGE_DEFS.map((badge) => ({
      ...badge,
      earned: earned.has(badge.id),
      progress: progress[badge.id],
    })),
  };
}

function recordEngagementOnDecision() {
  const todayKey = formatDateKey(Date.now());
  const engagement = getEngagementRaw();
  let currentStreak = 1;
  if (engagement.lastActiveDate === todayKey) {
    currentStreak = Math.max(1, engagement.currentStreak);
  } else if (engagement.lastActiveDate === shiftDateKey(todayKey, -1)) {
    currentStreak = Math.max(1, engagement.currentStreak + 1);
  }
  const longestStreak = Math.max(engagement.longestStreak, currentStreak);
  const stats = getStats();
  const badgeState = computeBadgeProgress(stats, {
    ...engagement,
    currentStreak,
    earnedBadges: engagement.earnedBadges,
  });
  const next = {
    lastActiveDate: todayKey,
    currentStreak,
    longestStreak,
    earnedBadges: badgeState.earnedBadges,
  };
  saveEngagement(next);
  return {
    ...next,
    stats,
    badges: badgeState.badges,
    newlyEarned: badgeState.newlyEarned,
  };
}

function getEngagementSummary() {
  const engagement = getEngagementRaw();
  const stats = getStats();
  const badgeState = computeBadgeProgress(stats, engagement);
  const earnedCount = badgeState.badges.filter((item) => item.earned).length;
  return {
    currentStreak: engagement.currentStreak,
    longestStreak: engagement.longestStreak,
    earnedCount,
    totalBadges: BADGE_DEFS.length,
    badges: badgeState.badges,
    stats,
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
  const hasEngagement = parsed.engagement !== undefined && parsed.engagement !== null;
  const incomingEngagement = hasEngagement
    ? normalizeEngagement(parsed.engagement)
    : getEngagementRaw();
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
    hasEngagement,
    normalized: {
      history: incomingHistory,
      customTemplates: incomingTemplates,
      settings: incomingSettings,
      engagement: incomingEngagement,
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
  const incomingEngagement = analyzed.normalized.engagement;

  if (mode === "merge") {
    const historyMap = new Map();
    getHistory().forEach((item) => historyMap.set(item.id, item));
    incomingHistory.forEach((item) => historyMap.set(item.id, item));
    setHistory(Array.from(historyMap.values()));

    const tplMap = new Map();
    getCustomTemplates().forEach((item) => tplMap.set(item.id, item));
    incomingTemplates.forEach((item) => tplMap.set(item.id, item));
    setCustomTemplates(Array.from(tplMap.values()));
    if (analyzed.hasEngagement) {
      saveEngagement(mergeEngagement(getEngagementRaw(), incomingEngagement));
    }
  } else {
    setHistory(incomingHistory);
    setCustomTemplates(incomingTemplates);
    if (analyzed.hasEngagement) {
      saveEngagement(incomingEngagement);
    }
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
  return recordEngagementOnDecision();
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
  normalizeTonePack,
  TONE_PACK_OPTIONS,
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
  getEngagementSummary,
  recordEngagementOnDecision,
  BADGE_DEFS,
};
