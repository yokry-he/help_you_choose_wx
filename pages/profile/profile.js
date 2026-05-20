const storage = require("../../utils/storage");
const { applyTabBarTheme } = require("../../utils/ui");
const {
  bindThemeListener,
  unbindThemeListener,
  applyPageTheme,
} = require("../../utils/theme-sync");

Page({
  data: {
    theme: {
      primary: "#9B59B6",
      primaryLight: "#BB8FD4",
      primaryDark: "#803DA0",
    },
    engagement: {
      currentStreak: 0,
      longestStreak: 0,
      earnedCount: 0,
      totalBadges: 0,
      badges: [],
    },
    menuItems: [
      {
        key: "settings",
        title: "互动与反馈",
        desc: "摇一摇、音效、语气包",
        icon: "⚙️",
        path: "/pages/settings/settings",
      },
      {
        key: "theme",
        title: "主题颜色",
        desc: "自定义应用主题色",
        icon: "🎨",
        path: "/pages/theme/theme",
      },
      {
        key: "about",
        title: "关于应用",
        desc: "版本号与甩锅声明",
        icon: "ⓘ",
        path: "/pages/about/about",
      },
      {
        key: "help",
        title: "帮助中心",
        desc: "常见问题解答",
        icon: "❔",
        path: "/pages/help/help",
      },
    ],
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
    const engagement = storage.getEngagementSummary();
    applyTabBarTheme(theme);
    applyPageTheme(this, theme, {
      extraData: {
        engagement,
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
        selected: 3,
        selectedColor: this.data.theme.primary,
      });
    }
  },
  goMenuPage(e) {
    const path = e.currentTarget.dataset.path;
    if (!path) return;
    wx.navigateTo({ url: path });
  },
});
