const storage = require("../../utils/storage");
const { THEMES } = require("../../utils/theme");
const { applyTabBarTheme } = require("../../utils/ui");

function pickThemeBySettings(settings) {
  return THEMES[settings.themeIndex] || THEMES[0];
}

function publishThemeChange(theme) {
  applyTabBarTheme(theme);
  const app = getApp();
  if (app && typeof app.emitThemeChange === "function") {
    app.emitThemeChange(theme);
  }
}

function commitThemeChange(settings, theme) {
  storage.saveSettings(settings);
  publishThemeChange(theme);
}

Page({
  data: {
    themes: THEMES,
    settings: storage.getSmartSettings(),
    currentTheme: storage.getCurrentTheme(),
  },
  onShow() {
    const settings = storage.getSmartSettings();
    const currentTheme = pickThemeBySettings(settings);
    publishThemeChange(currentTheme);
    this.setData({
      settings,
      currentTheme,
    });
  },
  chooseTheme(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isFinite(idx)) return;
    const settings = {
      ...this.data.settings,
      themeIndex: idx,
    };
    const currentTheme = pickThemeBySettings(settings);
    commitThemeChange(settings, currentTheme);
    this.setData({
      settings,
      currentTheme,
    });
    wx.showToast({
      title: "主题已切换",
      icon: "none",
    });
  },
});
