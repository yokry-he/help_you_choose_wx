const storage = require("../../utils/storage");
const { applyTabBarTheme } = require("../../utils/ui");
const { HOT_TEMPLATES } = require("../../utils/template-data");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

Page({
  data: {
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
    quickBg: "rgba(255, 140, 105, 0.08)",
    greetingText: "你好，纠结星人",
    hotTemplates: HOT_TEMPLATES,
    recentList: [],
    stats: {
      today: 0,
      thisWeek: 0,
      total: 0,
    },
  },
  onLoad() {
    bindThemeListener(this, (theme) => {
      applyTabBarTheme(theme);
      applyPageTheme(this, theme, {
        alphaFields: {
          quickBg: 0.08,
        },
        callback: () => {
          this.syncTabSelected();
        },
      });
    });
  },
  onShow() {
    const theme = storage.getCurrentTheme();
    const now = new Date();
    const hour = now.getHours();
    const prefix = hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
    const history = storage.getHistory();
    const recentList = history.slice(0, 3).map((item) => ({
      ...item,
      icon: this.detectRecordIcon(item.question, item.options),
      timeText: this.formatTime(item.createdAt),
    }));
    applyTabBarTheme(theme);
    applyPageTheme(this, theme, {
      alphaFields: {
        quickBg: 0.08,
      },
      extraData: {
        greetingText: `${prefix}，纠结星人`,
        recentList,
        stats: storage.getStats(),
      },
      callback: () => {
        this.syncTabSelected();
      },
    });
  },
  onUnload() {
    unbindThemeListener(this);
  },
  syncTabSelected() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        selectedColor: this.data.theme.primary,
      });
    }
  },
  formatTime(timestamp) {
    const d = new Date(timestamp);
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    return `${m}-${day} ${hh}:${mm}`;
  },
  detectRecordIcon(question, options = []) {
    const text = `${question || ""} ${Array.isArray(options) ? options.join(" ") : ""}`.toLowerCase();
    if (/(吃|饭|外卖|火锅|面|早餐|午餐|晚餐)/.test(text)) return "🍜";
    if (/(电影|逛|玩|旅游|出行|周末)/.test(text)) return "🎬";
    if (/(运动|跑步|健身|瑜伽)/.test(text)) return "🏃";
    if (/(消息|联系|感情|恋爱|回复|对象)/.test(text)) return "💬";
    if (/(买|购物|剁手)/.test(text)) return "🛍️";
    return "✨";
  },
  goDecision() {
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
  goTemplate() {
    wx.switchTab({
      url: "/pages/template/template",
    });
  },
  goHistory() {
    wx.switchTab({
      url: "/pages/history/history",
    });
  },
  useHotTemplate(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const draft = this.data.hotTemplates[idx];
    if (!draft) return;
    getApp().globalData.pendingDraft = draft;
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
});
