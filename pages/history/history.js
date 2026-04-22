const storage = require("../../utils/storage");
const { applyTabBarTheme } = require("../../utils/ui");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${m}-${day} ${hh}:${mm}`;
}

function createTemplateId() {
  return `tpl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

Page({
  data: {
    list: [],
    showSaveDialog: false,
    saveTargetId: "",
    saveTitle: "",
    maxTitleLength: 40,
    theme: {
      primary: "#FF8C69",
      primaryLight: "#FFB399",
      primaryDark: "#FF6B3D",
    },
  },
  onLoad() {
    bindThemeListener(this, (theme) => {
      applyTabBarTheme(theme);
      applyPageTheme(this, theme, {
        callback: () => {
          this.syncTabSelected();
        },
      });
    });
  },
  onShow() {
    const theme = storage.getCurrentTheme();
    applyTabBarTheme(theme);
    applyPageTheme(this, theme, {
      callback: () => {
        this.syncTabSelected();
      },
    });
    this.reload();
  },
  onUnload() {
    unbindThemeListener(this);
  },
  syncTabSelected() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2,
        selectedColor: this.data.theme.primary,
      });
    }
  },
  reload() {
    const list = storage.getHistory().map((it) => ({
      ...it,
      timeText: formatTime(it.createdAt),
      icon: this.detectRecordIcon(it.question, it.options),
    }));
    this.setData({ list });
  },
  detectRecordIcon(question, options = []) {
    const text = `${question || ""} ${Array.isArray(options) ? options.join(" ") : ""}`.toLowerCase();
    if (/(吃|饭|外卖|火锅|面|早餐|午餐|晚餐|奶茶|喝什么)/.test(text)) return "🍜";
    if (/(消息|联系|感情|恋爱|回复|对象|暧昧|表白)/.test(text)) return "💕";
    if (/(写|做|计划|作业|工作|学习)/.test(text)) return "✏️";
    if (/(电影|逛|玩|旅游|出行|周末)/.test(text)) return "🎬";
    return "✨";
  },
  remove(e) {
    const id = e.currentTarget.dataset.id;
    storage.removeHistory(id);
    this.reload();
  },
  clearAll() {
    wx.showModal({
      title: "提示",
      content: "确认清空全部历史记录吗？",
      success: (res) => {
        if (!res.confirm) return;
        storage.clearHistory();
        this.reload();
      },
    });
  },
  reuse(e) {
    const id = e.currentTarget.dataset.id;
    const target = this.data.list.find((it) => it.id === id);
    if (!target) return;
    getApp().globalData.pendingDraft = {
      question: target.question,
      options: target.options,
    };
    wx.navigateTo({
      url: "/pages/decision/decision",
    });
  },
  saveAsTemplate(e) {
    const id = e.currentTarget.dataset.id;
    const target = this.data.list.find((it) => it.id === id);
    if (!target) return;
    const title = `${target.question || ""}`.trim().slice(0, this.data.maxTitleLength);
    this.setData({
      showSaveDialog: true,
      saveTargetId: id,
      saveTitle: title,
    });
  },
  onSaveTitleInput(e) {
    const raw = e.detail.value || "";
    this.setData({
      saveTitle: raw.slice(0, this.data.maxTitleLength),
    });
  },
  closeSaveDialog() {
    this.setData({
      showSaveDialog: false,
      saveTargetId: "",
      saveTitle: "",
    });
  },
  confirmSaveTemplate() {
    const id = this.data.saveTargetId;
    const target = this.data.list.find((it) => it.id === id);
    if (!target) {
      this.closeSaveDialog();
      return;
    }
    const title = this.data.saveTitle.trim();
    if (!title) {
      wx.showToast({
        title: "请输入模板标题",
        icon: "none",
      });
      return;
    }
    storage.upsertCustomTemplate({
      id: createTemplateId(),
      title,
      question: target.question,
      options: target.options,
      icon: "📌",
      usageCount: 0,
      createdAt: Date.now(),
    });
    this.closeSaveDialog();
    wx.showToast({
      title: "已保存到自定义模板",
      icon: "success",
    });
  },
  noop() {},
});
